// Compliance Monitor Agent — core logic
//
// Checks each market's official source URLs for regulatory changes using a
// two-model strategy to minimize cost:
//   1. SHA-256 hash check — if page text hasn't changed, zero AI calls
//   2. Haiku 4.5 — cheap pre-screen: meaningful change vs. cosmetic noise
//   3. Sonnet 4.6 — full structured diff, only when Haiku confirms a real change
//
// Kill switch: set COMPLIANCE_MONITOR_ENABLED=false to exit immediately at zero cost.

import Anthropic from '@anthropic-ai/sdk'
import { createHash } from 'crypto'
import { Resend } from 'resend'
import { db } from '@/lib/db'
import { discoverReplacements, type DiscoveryResult } from '@/lib/agents/source-discoverer'
import {
  runRuleUpdater,
  type FetchedSourceContent,
  type RuleUpdateResult,
} from '@/lib/agents/rule-updater'
import { signApprovalToken } from '@/lib/approval-token'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChangeField =
  | 'strStatus'
  | 'permitRequired'
  | 'ownerOccupancyRequired'
  | 'summary'
  | 'notableRestrictions'
  | 'ruleDetail'
  | 'codeRef'

interface DetectedChange {
  field: ChangeField
  currentValue: string
  newValue: string
  confidence: number
  evidence: string
}

interface SourceResult {
  sourceId: string
  url: string
  status: 'unchanged' | 'auto_updated' | 'flagged' | 'broken'
  changes?: DetectedChange[]
}

interface MarketResult {
  marketId: string
  marketName: string
  sources: SourceResult[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const HIGH_RISK_FIELDS = new Set<ChangeField>([
  'strStatus',
  'permitRequired',
  'ownerOccupancyRequired',
])

// Fields where Sonnet output maps directly to a Market column
const MARKET_FIELD_MAP: Partial<Record<ChangeField, string>> = {
  summary: 'summary',
  notableRestrictions: 'notableRestrictions',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isDue(market: { freshnessStatus: string; lastReviewedAt: Date }): boolean {
  const daysSince = (Date.now() - market.lastReviewedAt.getTime()) / 86_400_000
  if (market.freshnessStatus === 'fresh') return daysSince >= 30
  return true // review_due or needs_review → always run
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 12_000) // ~3,000 tokens
}

function sha256(text: string): string {
  return createHash('sha256').update(text).digest('hex')
}

async function fetchSourceText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'STRComply-ComplianceBot/1.0' },
    })
    if (!res.ok) return null
    const html = await res.text()
    return stripHtml(html)
  } catch {
    return null
  }
}

// ---------------------------------------------------------------------------
// AI calls
// ---------------------------------------------------------------------------

async function haikusaysChanged(
  anthropic: Anthropic,
  marketName: string,
  sourceText: string
): Promise<boolean> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 64,
    messages: [
      {
        role: 'user',
        content: `You are reviewing a city government webpage about short-term rental regulations for ${marketName}.

Page content:
${sourceText.slice(0, 4000)}

Has this page likely changed in a way that would affect STR regulations (permit requirements, occupancy rules, nightly caps, eligibility)? Ignore nav/footer/cosmetic changes.

Reply with exactly one word: YES or NO`,
      },
    ],
  })
  const reply = (msg.content[0] as { text: string }).text.trim().toUpperCase()
  return reply.startsWith('YES')
}

async function sonnetDiff(
  anthropic: Anthropic,
  market: { name: string; strStatus: string; permitRequired: string; ownerOccupancyRequired: string; summary: string; notableRestrictions: string | null },
  sourceUrl: string,
  sourceText: string
): Promise<DetectedChange[]> {
  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    messages: [
      {
        role: 'user',
        content: `You are a short-term rental compliance analyst.

Current DB record for ${market.name}:
${JSON.stringify({
  strStatus: market.strStatus,
  permitRequired: market.permitRequired,
  ownerOccupancyRequired: market.ownerOccupancyRequired,
  summary: market.summary,
  notableRestrictions: market.notableRestrictions,
}, null, 2)}

Source content from ${sourceUrl}:
${sourceText.slice(0, 8000)}

Compare the source to the current record. Return JSON only — no prose, no markdown:
{
  "changesDetected": boolean,
  "changes": [
    {
      "field": "strStatus | permitRequired | ownerOccupancyRequired | summary | notableRestrictions | ruleDetail | codeRef",
      "currentValue": "string",
      "newValue": "string",
      "confidence": 0.0,
      "evidence": "direct quote from source"
    }
  ]
}`,
      },
    ],
  })

  try {
    const raw = (msg.content[0] as { text: string }).text.trim()
    const parsed = JSON.parse(raw)
    if (!parsed.changesDetected) return []
    return parsed.changes as DetectedChange[]
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Main runner
// ---------------------------------------------------------------------------

export async function runComplianceMonitor(): Promise<void> {
  if (process.env.COMPLIANCE_MONITOR_ENABLED !== 'true') {
    console.log('[compliance-monitor] Disabled — set COMPLIANCE_MONITOR_ENABLED=true to enable')
    return
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
  const resend = new Resend(process.env.RESEND_KEY)

  // Fetch all markets with their sources
  const markets = await db.$queryRaw<
    Array<{
      id: string
      name: string
      strStatus: string
      permitRequired: string
      ownerOccupancyRequired: string
      summary: string
      notableRestrictions: string | null
      freshnessStatus: string
      lastReviewedAt: Date
    }>
  >`
    SELECT id, name, "strStatus", "permitRequired", "ownerOccupancyRequired",
           summary, "notableRestrictions", "freshnessStatus", "lastReviewedAt"
    FROM "Market"
    WHERE "supportStatus" = 'supported'
  `

  const due = markets.filter(isDue)
  if (due.length === 0) {
    console.log('[compliance-monitor] No markets due for review — exiting')
    return
  }

  console.log(`[compliance-monitor] Checking ${due.length} markets`)

  const results: MarketResult[] = []
  const changedSources: FetchedSourceContent[] = []

  // Process markets in parallel
  await Promise.all(
    due.map(async (market) => {
      const sources = await db.$queryRaw<
        Array<{ id: string; url: string; contentHash: string | null }>
      >`
        SELECT id, url, "contentHash"
        FROM "MarketSource"
        WHERE "marketId" = ${market.id}
          AND "sourceStatus" = 'active'
      `

      const sourceResults: SourceResult[] = []

      for (const source of sources) {
        console.log(`[compliance-monitor] Fetching ${source.url}`)
        const text = await fetchSourceText(source.url)

        // Broken source
        if (text === null) {
          sourceResults.push({ sourceId: source.id, url: source.url, status: 'broken' })
          continue
        }

        const hash = sha256(text)

        // Hash match — skip all AI calls
        if (hash === source.contentHash) {
          console.log(`[compliance-monitor] No change (hash match): ${source.url}`)
          sourceResults.push({ sourceId: source.id, url: source.url, status: 'unchanged' })
          continue
        }

        // Hash changed — Haiku pre-screen
        const meaningfulChange = await haikusaysChanged(anthropic, market.name, text)
        if (!meaningfulChange) {
          // Update hash, mark fresh, no Sonnet call
          await db.$executeRaw`
            UPDATE "MarketSource" SET "contentHash" = ${hash} WHERE id = ${source.id}
          `
          sourceResults.push({ sourceId: source.id, url: source.url, status: 'unchanged' })
          continue
        }

        // Hand off to rule-updater after this loop
        changedSources.push({
          marketId: market.id,
          marketName: market.name,
          sourceId: source.id,
          sourceUrl: source.url,
          text,
        })

        // Sonnet full diff
        const changes = await sonnetDiff(anthropic, market, source.url, text)

        // Update hash regardless
        await db.$executeRaw`
          UPDATE "MarketSource" SET "contentHash" = ${hash} WHERE id = ${source.id}
        `

        if (changes.length === 0) {
          sourceResults.push({ sourceId: source.id, url: source.url, status: 'unchanged' })
          continue
        }

        const highRisk = changes.filter((c) => HIGH_RISK_FIELDS.has(c.field))
        const lowRisk = changes.filter((c) => !HIGH_RISK_FIELDS.has(c.field))

        // Auto-apply low-risk changes
        for (const change of lowRisk) {
          const col = MARKET_FIELD_MAP[change.field]
          if (col === 'summary') {
            await db.$executeRaw`UPDATE "Market" SET summary = ${change.newValue}, "updatedAt" = NOW() WHERE id = ${market.id}`
          } else if (col === 'notableRestrictions') {
            await db.$executeRaw`UPDATE "Market" SET "notableRestrictions" = ${change.newValue}, "updatedAt" = NOW() WHERE id = ${market.id}`
          }
        }

        if (highRisk.length > 0) {
          // Flag for human review — do NOT write strStatus / permitRequired etc.
          await db.$executeRaw`
            UPDATE "Market"
            SET "freshnessStatus" = 'needs_review', "updatedAt" = NOW()
            WHERE id = ${market.id}
          `
          sourceResults.push({
            sourceId: source.id,
            url: source.url,
            status: 'flagged',
            changes: highRisk,
          })
        } else {
          await db.$executeRaw`
            UPDATE "Market"
            SET "freshnessStatus" = 'fresh', "lastReviewedAt" = NOW(), "updatedAt" = NOW()
            WHERE id = ${market.id}
          `
          sourceResults.push({
            sourceId: source.id,
            url: source.url,
            status: 'auto_updated',
            changes: lowRisk,
          })
        }
      }

      results.push({ marketId: market.id, marketName: market.name, sources: sourceResults })
    })
  )

  // Persist broken status to DB so the discoverer can query them
  const brokenSources = results
    .flatMap((r) => r.sources)
    .filter((s) => s.status === 'broken')
    .map((s) => ({ sourceId: s.sourceId, url: s.url }))

  for (const s of brokenSources) {
    await db.$executeRaw`
      UPDATE "MarketSource"
      SET "sourceStatus" = 'broken', "brokenSince" = NOW()
      WHERE id = ${s.sourceId} AND "sourceStatus" = 'active'
    `
  }

  // Run discoverer for broken sources, fold results into the email
  let discoveryResult: DiscoveryResult = { candidates: [], exhausted: [] }
  if (brokenSources.length > 0) {
    console.log(`[compliance-monitor] ${brokenSources.length} broken source(s) — running discoverer`)
    discoveryResult = await discoverReplacements(brokenSources, anthropic)
  }

  // Run rule-updater for sources with confirmed meaningful changes
  let ruleResult: RuleUpdateResult = {
    codeUrlIssues: [],
    autoAppliedChanges: [],
    flaggedChanges: [],
    candidateNewRules: [],
  }
  if (changedSources.length > 0) {
    console.log(`[compliance-monitor] ${changedSources.length} changed source(s) — running rule updater`)
    ruleResult = await runRuleUpdater(changedSources, anthropic)
  }

  // Build and send summary email
  await sendSummaryEmail(resend, results, discoveryResult, ruleResult)
  console.log('[compliance-monitor] Run complete')
}

// ---------------------------------------------------------------------------
// Email report
// ---------------------------------------------------------------------------

async function sendSummaryEmail(
  resend: Resend,
  results: MarketResult[],
  discovery: DiscoveryResult,
  rules: RuleUpdateResult
): Promise<void> {
  const flagged = results.filter((r) => r.sources.some((s) => s.status === 'flagged'))
  const updated = results.filter((r) => r.sources.some((s) => s.status === 'auto_updated'))
  const broken = results.flatMap((r) =>
    r.sources.filter((s) => s.status === 'broken').map((s) => ({ market: r.marketName, url: s.url }))
  )

  const appUrl = process.env.AUTH_URL ?? 'http://localhost:3001'
  const secret = process.env.AUTH_SECRET ?? ''

  const lines: string[] = [
    `STR Comply — Weekly Compliance Check`,
    `Checked ${results.length} market(s) on ${new Date().toDateString()}`,
    ``,
  ]

  if (updated.length > 0) {
    lines.push(`✓ Auto-updated (${updated.length}):`)
    for (const r of updated) {
      for (const s of r.sources.filter((s) => s.status === 'auto_updated')) {
        const fields = s.changes?.map((c) => c.field).join(', ') ?? 'unknown'
        lines.push(`  • ${r.marketName}: ${fields}`)
      }
    }
    lines.push(``)
  }

  if (flagged.length > 0) {
    lines.push(`⚠ Needs your review (${flagged.length}):`)
    for (const r of flagged) {
      for (const s of r.sources.filter((s) => s.status === 'flagged')) {
        lines.push(`  • ${r.marketName} — ${s.url}`)
        for (const c of s.changes ?? []) {
          lines.push(`    Field: ${c.field}`)
          lines.push(`    Was:   ${c.currentValue}`)
          lines.push(`    Now:   ${c.newValue}`)
          lines.push(`    Quote: "${c.evidence}"`)
          lines.push(`    Confidence: ${Math.round(c.confidence * 100)}%`)
          lines.push(``)
        }
      }
    }
  }

  if (broken.length > 0) {
    lines.push(`✗ Broken sources (${broken.length}):`)
    for (const b of broken) {
      lines.push(`  • ${b.market}: ${b.url}`)
    }
    lines.push(``)
  }

  // Rule field auto-updates (low-risk: details, codeRef, codeUrl)
  if (rules.autoAppliedChanges.length > 0) {
    lines.push(`✓ Rule fields auto-updated (${rules.autoAppliedChanges.length}):`)
    for (const c of rules.autoAppliedChanges) {
      lines.push(`  • ${c.ruleKey}.${c.field}: "${c.currentValue ?? 'null'}" → "${c.newValue}"`)
    }
    lines.push(``)
  }

  // Rule value changes flagged for human review (high-risk: value)
  if (rules.flaggedChanges.length > 0) {
    lines.push(`⚠ Rule values need your review (${rules.flaggedChanges.length}):`)
    for (const c of rules.flaggedChanges) {
      lines.push(`  • ${c.ruleKey} (${c.label})`)
      lines.push(`    Was:        ${c.currentValue ?? 'null'}`)
      lines.push(`    Now:        ${c.newValue}`)
      lines.push(`    Quote:      "${c.evidence}"`)
      lines.push(`    Confidence: ${Math.round(c.confidence * 100)}%`)
      lines.push(``)
    }
  }

  // Candidate new rule types detected in sources
  if (rules.candidateNewRules.length > 0) {
    lines.push(`🆕 Candidate new rules (${rules.candidateNewRules.length}) — manual review required:`)
    lines.push(``)
    for (const r of rules.candidateNewRules) {
      lines.push(`  Market:     ${r.marketName}`)
      lines.push(`  Key:        ${r.proposedRuleKey}`)
      lines.push(`  Label:      ${r.proposedLabel}`)
      lines.push(`  Value:      ${r.proposedValue}`)
      if (r.proposedDetails) lines.push(`  Details:    ${r.proposedDetails}`)
      if (r.proposedCodeRef) lines.push(`  Code ref:   ${r.proposedCodeRef}`)
      if (r.proposedCodeUrl) lines.push(`  Code URL:   ${r.proposedCodeUrl}`)
      lines.push(`  Quote:      "${r.evidence}"`)
      lines.push(`  Confidence: ${Math.round(r.confidence * 100)}%`)
      lines.push(`  Source:     ${r.sourceUrl}`)
      lines.push(``)
    }
  }

  // Broken codeUrls (informational — no auto-action, requires human to find replacement)
  if (rules.codeUrlIssues.length > 0) {
    lines.push(`✗ Broken rule citation links (${rules.codeUrlIssues.length}):`)
    for (const u of rules.codeUrlIssues) {
      const status = u.httpStatus !== null ? `HTTP ${u.httpStatus}` : 'unreachable'
      lines.push(`  • ${u.marketName} — ${u.label} (${u.ruleKey}): ${status}`)
      lines.push(`    ${u.codeUrl}`)
    }
    lines.push(``)
  }

  // Discovery candidates — one approve/dismiss link pair per candidate
  if (discovery.candidates.length > 0) {
    lines.push(`🔍 Replacement candidates found (${discovery.candidates.length}):`)
    lines.push(``)
    for (const c of discovery.candidates) {
      const token = signApprovalToken(c.pendingSourceId, secret)
      const approveUrl = `${appUrl}/api/admin/approve-source?id=${c.pendingSourceId}&action=approve&token=${token}`
      const dismissUrl = `${appUrl}/api/admin/approve-source?id=${c.pendingSourceId}&action=dismiss&token=${token}`
      lines.push(`  Market:   ${c.marketName}`)
      lines.push(`  Broken:   ${c.brokenUrl}`)
      lines.push(`  Found:    ${c.url}`)
      lines.push(`  Title:    ${c.title}`)
      lines.push(`  Publisher:${c.publisher}`)
      lines.push(``)
      lines.push(`  APPROVE → ${approveUrl}`)
      lines.push(`  DISMISS → ${dismissUrl}`)
      lines.push(``)
    }
  }

  // Sources where all 3 discovery attempts failed — needs manual work
  if (discovery.exhausted.length > 0) {
    lines.push(`❌ Discovery exhausted — manual review needed (${discovery.exhausted.length}):`)
    for (const e of discovery.exhausted) {
      lines.push(`  • ${e.marketName}: ${e.brokenUrl} (${e.attempts} attempts failed)`)
    }
    lines.push(``)
  }

  if (
    flagged.length === 0 &&
    updated.length === 0 &&
    broken.length === 0 &&
    discovery.candidates.length === 0
  ) {
    lines.push(`All markets are current. No changes detected.`)
  }

  const body = lines.join('\n')
  console.log('[compliance-monitor] Email report:\n' + body)

  const needsAction =
    flagged.length > 0 ||
    discovery.candidates.length > 0 ||
    discovery.exhausted.length > 0 ||
    rules.flaggedChanges.length > 0 ||
    rules.candidateNewRules.length > 0 ||
    rules.codeUrlIssues.length > 0

  try {
    await resend.emails.send({
      from: 'STR Comply <onboarding@resend.dev>',
      to: process.env.COMPLIANCE_REPORT_EMAIL ?? 'pinoiboimusic@gmail.com',
      subject: `STR Comply — Compliance Check ${needsAction ? '⚠ Action needed' : '✓ All clear'}`,
      text: body,
    })
  } catch (err) {
    console.error('[compliance-monitor] Failed to send email:', err)
  }
}
