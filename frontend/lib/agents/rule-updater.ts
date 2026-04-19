// Rule Updater Agent
//
// Handles rule-level changes the compliance monitor doesn't cover:
//   1. codeUrl validity — HEAD-checks all rule citation links (no AI)
//   2. Rule field changes — detects updates to value/details/codeRef/codeUrl
//      Auto-applies low-risk changes (details, codeRef, codeUrl)
//      Flags high-risk changes (value) for human review via email
//   3. New rule detection — identifies regulation types not in the DB
//      Candidates are reported via email only (no auto-insert)
//
// Called by runComplianceMonitor after source processing, before sendSummaryEmail.
// Receives already-fetched source text — no extra HTTP fetches for page content.
//
// Cost: ~$0.012 per changed source (Haiku pre-screen + Sonnet analysis).
// Quiet weeks with no hash changes cost $0.00.

import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

// Passed in from compliance-monitor — already stripped HTML, already Haiku-confirmed
export interface FetchedSourceContent {
  marketId: string
  marketName: string
  sourceId: string
  sourceUrl: string
  text: string
}

interface ExistingRule {
  id: string
  marketId: string
  ruleKey: string
  label: string
  value: string
  details: string | null
  codeRef: string | null
  codeUrl: string | null
  jurisdictionLevel: string | null
}

type RuleField = 'value' | 'details' | 'codeRef' | 'codeUrl'

export interface RuleFieldChange {
  ruleId: string
  marketId: string
  ruleKey: string
  label: string
  field: RuleField
  currentValue: string | null
  newValue: string
  confidence: number
  evidence: string
  risk: 'low' | 'high'
}

export interface CandidateNewRule {
  marketId: string
  marketName: string
  proposedRuleKey: string
  proposedLabel: string
  proposedValue: string
  proposedDetails: string | null
  proposedCodeRef: string | null
  proposedCodeUrl: string | null
  proposedJurisdictionLevel: string | null
  confidence: number
  evidence: string
  sourceUrl: string
}

export interface CodeUrlCheckResult {
  ruleId: string
  marketId: string
  marketName: string
  ruleKey: string
  label: string
  codeUrl: string
  codeRef: string | null
  httpStatus: number | null  // null = network error / timeout
  isAlive: boolean
}

export interface RuleUpdateResult {
  codeUrlIssues: CodeUrlCheckResult[]
  autoAppliedChanges: RuleFieldChange[]
  flaggedChanges: RuleFieldChange[]
  candidateNewRules: CandidateNewRule[]
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

// value is user-visible in the UI rule card — wrong auto-update has direct accuracy consequences
const HIGH_RISK_RULE_FIELDS = new Set<RuleField>(['value'])

// details/codeRef/codeUrl are citation/context metadata — lower stakes, auto-apply
const LOW_RISK_RULE_FIELDS = new Set<RuleField>(['details', 'codeRef', 'codeUrl'])

// ---------------------------------------------------------------------------
// Stage 0: codeUrl health check (no AI, runs before source analysis)
// ---------------------------------------------------------------------------

export async function checkCodeUrls(marketIds: string[]): Promise<CodeUrlCheckResult[]> {
  if (marketIds.length === 0) return []

  const rules = await db.$queryRaw<
    Array<{
      ruleId: string
      marketId: string
      marketName: string
      ruleKey: string
      label: string
      codeUrl: string
      codeRef: string | null
    }>
  >`
    SELECT
      mr.id AS "ruleId",
      mr."marketId",
      m.name AS "marketName",
      mr."ruleKey",
      mr.label,
      mr."codeUrl",
      mr."codeRef"
    FROM "MarketRule" mr
    JOIN "Market" m ON m.id = mr."marketId"
    WHERE mr."codeUrl" IS NOT NULL
      AND mr."marketId" = ANY(${marketIds}::text[])
  `

  if (rules.length === 0) return []

  // Run all HEAD checks concurrently; fall back to GET if server rejects HEAD
  const settled = await Promise.allSettled(
    rules.map(async (rule) => {
      try {
        let res = await fetch(rule.codeUrl, {
          method: 'HEAD',
          signal: AbortSignal.timeout(6_000),
          headers: { 'User-Agent': 'STRComply-ComplianceBot/1.0' },
        })
        if (res.status === 405) {
          res = await fetch(rule.codeUrl, {
            method: 'GET',
            signal: AbortSignal.timeout(6_000),
            headers: { 'User-Agent': 'STRComply-ComplianceBot/1.0' },
          })
        }
        return { ...rule, httpStatus: res.status, isAlive: res.ok } as CodeUrlCheckResult
      } catch {
        return { ...rule, httpStatus: null, isAlive: false } as CodeUrlCheckResult
      }
    })
  )

  return settled
    .filter((r): r is PromiseFulfilledResult<CodeUrlCheckResult> => r.status === 'fulfilled')
    .map((r) => r.value)
    .filter((r) => !r.isAlive) // report only broken ones
}

// ---------------------------------------------------------------------------
// Stage 1: Haiku pre-screen — does source mention new regulation types?
// ---------------------------------------------------------------------------

async function haikuDetectsNewRuleType(
  anthropic: Anthropic,
  marketName: string,
  existingRuleKeys: string[],
  sourceText: string
): Promise<boolean> {
  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 64,
    messages: [
      {
        role: 'user',
        content: `You are reviewing a city government webpage about short-term rental regulations for ${marketName}.

Existing regulation categories already tracked: ${existingRuleKeys.join(', ')}

Page content:
${sourceText.slice(0, 4000)}

Does this page describe any short-term rental regulation type NOT already in the list above? Examples of new types: guest limit, noise ordinance, insurance requirement, platform data-sharing fee, or similar.

Reply with exactly one word: YES or NO`,
      },
    ],
  })
  const reply = (msg.content[0] as { text: string }).text.trim().toUpperCase()
  console.log(`[rule-updater] Haiku new-rule pre-screen for ${marketName}: ${reply}`)
  return reply.startsWith('YES')
}

// ---------------------------------------------------------------------------
// Stage 2: Sonnet — detect rule field changes + candidate new rules
// ---------------------------------------------------------------------------

interface SonnetRuleAnalysisResult {
  existingRuleChanges: Array<{
    ruleId: string
    ruleKey: string
    field: RuleField
    currentValue: string | null
    newValue: string
    confidence: number
    evidence: string
  }>
  candidateNewRules: Array<{
    proposedRuleKey: string
    proposedLabel: string
    proposedValue: string
    proposedDetails: string | null
    proposedCodeRef: string | null
    proposedCodeUrl: string | null
    proposedJurisdictionLevel: string | null
    confidence: number
    evidence: string
  }>
}

async function sonnetRuleAnalysis(
  anthropic: Anthropic,
  market: { id: string; name: string },
  existingRules: ExistingRule[],
  sourceUrl: string,
  sourceText: string,
  includeNewRuleCandidates: boolean
): Promise<SonnetRuleAnalysisResult> {
  const rulesJson = JSON.stringify(
    existingRules.map((r) => ({
      ruleId: r.id,
      ruleKey: r.ruleKey,
      label: r.label,
      value: r.value,
      details: r.details,
      codeRef: r.codeRef,
      codeUrl: r.codeUrl,
    })),
    null,
    2
  )

  const newRulesInstruction = includeNewRuleCandidates
    ? `2. Identify any regulation types described in the source that are NOT covered by any existing rule. Match by regulatory concept — "maximum annual rental nights" and "nightly_cap" are the same concept, not a new rule.`
    : `2. Do NOT suggest new rules — focus only on changes to existing rules.`

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1536,
    messages: [
      {
        role: 'user',
        content: `You are a short-term rental compliance analyst reviewing source content for ${market.name}.

Current rules in the database (use ruleId exactly as shown):
${rulesJson}

Source content from ${sourceUrl}:
${sourceText.slice(0, 8000)}

Tasks:
1. Compare each existing rule against the source. Report only rules where the source clearly contradicts or updates the current DB value. Match by regulatory concept, not exact wording.
${newRulesInstruction}

Return JSON only — no prose, no markdown fences:
{
  "existingRuleChanges": [
    {
      "ruleId": "exact id from the list above",
      "ruleKey": "rule key",
      "field": "value | details | codeRef | codeUrl",
      "currentValue": "current value or null",
      "newValue": "updated value from source",
      "confidence": 0.0,
      "evidence": "direct quote from source"
    }
  ],
  "candidateNewRules": [
    {
      "proposedRuleKey": "snake_case_key",
      "proposedLabel": "Human-readable label",
      "proposedValue": "Plain-English value",
      "proposedDetails": "Expanded explanation or null",
      "proposedCodeRef": "Code citation or null",
      "proposedCodeUrl": "URL to code section or null",
      "proposedJurisdictionLevel": "city | county | state | null",
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
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (!jsonMatch) return { existingRuleChanges: [], candidateNewRules: [] }
    const parsed = JSON.parse(jsonMatch[0])
    return {
      existingRuleChanges: Array.isArray(parsed.existingRuleChanges)
        ? parsed.existingRuleChanges
        : [],
      candidateNewRules: Array.isArray(parsed.candidateNewRules)
        ? parsed.candidateNewRules
        : [],
    }
  } catch {
    return { existingRuleChanges: [], candidateNewRules: [] }
  }
}

// ---------------------------------------------------------------------------
// DB helpers
// ---------------------------------------------------------------------------

async function fetchMarketRules(marketId: string): Promise<ExistingRule[]> {
  return db.$queryRaw<ExistingRule[]>`
    SELECT id, "marketId", "ruleKey", label, value, details, "codeRef", "codeUrl", "jurisdictionLevel"
    FROM "MarketRule"
    WHERE "marketId" = ${marketId}
    ORDER BY "displayOrder"
  `
}

async function applyLowRiskRuleChanges(changes: RuleFieldChange[]): Promise<void> {
  for (const change of changes) {
    if (change.field === 'details') {
      await db.$executeRaw`
        UPDATE "MarketRule" SET details = ${change.newValue}, "updatedAt" = NOW()
        WHERE id = ${change.ruleId}
      `
    } else if (change.field === 'codeRef') {
      await db.$executeRaw`
        UPDATE "MarketRule" SET "codeRef" = ${change.newValue}, "updatedAt" = NOW()
        WHERE id = ${change.ruleId}
      `
    } else if (change.field === 'codeUrl') {
      await db.$executeRaw`
        UPDATE "MarketRule" SET "codeUrl" = ${change.newValue}, "updatedAt" = NOW()
        WHERE id = ${change.ruleId}
      `
    }
    console.log(
      `[rule-updater] Auto-applied ${change.marketId} ${change.ruleKey}.${change.field} → "${change.newValue}"`
    )
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export async function runRuleUpdater(
  changedSources: FetchedSourceContent[],
  anthropic: Anthropic
): Promise<RuleUpdateResult> {
  const result: RuleUpdateResult = {
    codeUrlIssues: [],
    autoAppliedChanges: [],
    flaggedChanges: [],
    candidateNewRules: [],
  }

  if (changedSources.length === 0) {
    console.log('[rule-updater] No changed sources — skipping')
    return result
  }

  // Stage 0: codeUrl health check across all affected markets (no AI)
  const marketIds = [...new Set(changedSources.map((s) => s.marketId))]
  console.log(`[rule-updater] Checking codeUrls for ${marketIds.length} market(s)`)
  result.codeUrlIssues = await checkCodeUrls(marketIds)
  if (result.codeUrlIssues.length > 0) {
    console.log(`[rule-updater] ${result.codeUrlIssues.length} broken codeUrl(s) found`)
  }

  // Analyze rules for each changed source
  for (const source of changedSources) {
    console.log(`[rule-updater] Analyzing rules for ${source.marketName} — ${source.sourceUrl}`)

    let existingRules: ExistingRule[]
    try {
      existingRules = await fetchMarketRules(source.marketId)
    } catch (err) {
      console.error(`[rule-updater] Failed to fetch rules for ${source.marketName}:`, err)
      continue
    }

    if (existingRules.length === 0) {
      console.log(`[rule-updater] No rules found for ${source.marketName} — skipping`)
      continue
    }

    // Stage 1: Haiku pre-screen for new rule types
    let mightHaveNewRules = false
    try {
      mightHaveNewRules = await haikuDetectsNewRuleType(
        anthropic,
        source.marketName,
        existingRules.map((r) => r.ruleKey),
        source.text
      )
    } catch (err) {
      console.error(`[rule-updater] Haiku pre-screen failed for ${source.marketName}:`, err)
    }

    // Stage 2: Sonnet rule analysis (always runs for existing rule changes)
    let analysis: SonnetRuleAnalysisResult = { existingRuleChanges: [], candidateNewRules: [] }
    try {
      analysis = await sonnetRuleAnalysis(
        anthropic,
        { id: source.marketId, name: source.marketName },
        existingRules,
        source.sourceUrl,
        source.text,
        mightHaveNewRules
      )
    } catch (err) {
      console.error(`[rule-updater] Sonnet analysis failed for ${source.marketName}:`, err)
      continue
    }

    // Classify rule field changes by risk
    const sourceAutoApplied: RuleFieldChange[] = []
    const sourceFlagged: RuleFieldChange[] = []

    for (const change of analysis.existingRuleChanges) {
      // Guard against hallucinated ruleIds
      const matchedRule = existingRules.find((r) => r.id === change.ruleId)
      if (!matchedRule) {
        console.log(`[rule-updater] Skipping change — ruleId "${change.ruleId}" not in DB`)
        continue
      }

      const field = change.field as RuleField
      if (!HIGH_RISK_RULE_FIELDS.has(field) && !LOW_RISK_RULE_FIELDS.has(field)) continue

      const ruleChange: RuleFieldChange = {
        ruleId: change.ruleId,
        marketId: source.marketId,
        ruleKey: change.ruleKey,
        label: matchedRule.label,
        field,
        currentValue: change.currentValue,
        newValue: change.newValue,
        confidence: change.confidence,
        evidence: change.evidence,
        risk: HIGH_RISK_RULE_FIELDS.has(field) ? 'high' : 'low',
      }

      if (ruleChange.risk === 'low') {
        sourceAutoApplied.push(ruleChange)
      } else {
        sourceFlagged.push(ruleChange)
      }
    }

    // Write low-risk changes to DB
    if (sourceAutoApplied.length > 0) {
      try {
        await applyLowRiskRuleChanges(sourceAutoApplied)
        result.autoAppliedChanges.push(...sourceAutoApplied)
      } catch (err) {
        console.error(`[rule-updater] Failed to apply changes for ${source.marketName}:`, err)
      }
    }

    result.flaggedChanges.push(...sourceFlagged)

    // Collect candidate new rules (only when Haiku said YES)
    if (mightHaveNewRules) {
      for (const candidate of analysis.candidateNewRules) {
        result.candidateNewRules.push({
          marketId: source.marketId,
          marketName: source.marketName,
          proposedRuleKey: candidate.proposedRuleKey,
          proposedLabel: candidate.proposedLabel,
          proposedValue: candidate.proposedValue,
          proposedDetails: candidate.proposedDetails,
          proposedCodeRef: candidate.proposedCodeRef,
          proposedCodeUrl: candidate.proposedCodeUrl,
          proposedJurisdictionLevel: candidate.proposedJurisdictionLevel,
          confidence: candidate.confidence,
          evidence: candidate.evidence,
          sourceUrl: source.sourceUrl,
        })
      }
    }
  }

  console.log(
    `[rule-updater] Complete — ${result.autoAppliedChanges.length} auto-applied, ` +
      `${result.flaggedChanges.length} flagged, ` +
      `${result.candidateNewRules.length} new rule candidates, ` +
      `${result.codeUrlIssues.length} broken codeUrls`
  )

  return result
}
