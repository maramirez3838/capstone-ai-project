// POST /api/admin/ingest-market
//
// HMAC-protected admin endpoint that refreshes an existing market's STR rules using
// the Market Refresh Agent (Haiku pre-screen → Sonnet + web_search).
//
// Scope lock: only markets already in the DB can be refreshed. The agent receives
// the current record as grounded context so it improves known data rather than
// hallucinating new cities.
//
// After refresh: market is set to freshnessStatus='needs_review'. A human reviewer
// must promote it to 'fresh' before it surfaces as current to users.
//
// Token generation (one-time, expires in 5 minutes):
//   node -e "
//     const { createHmac } = require('crypto');
//     const ts = Date.now().toString();
//     const sig = createHmac('sha256', process.env.AUTH_SECRET).update(ts).digest('hex');
//     console.log(Buffer.from(ts + ':' + sig).toString('base64url'));
//   "

import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { randomUUID } from 'crypto'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  runMarketIngestionAgent,
  type ExistingMarketContext,
  type MarketIngestionResult,
} from '@/lib/agents/market-ingestion-agent'

// ---------------------------------------------------------------------------
// HMAC admin auth — time-limited token (5 min TTL)
// ---------------------------------------------------------------------------

const ADMIN_TOKEN_TTL_MS = 5 * 60 * 1000

function verifyAdminToken(token: string, secret: string): boolean {
  try {
    const decoded = Buffer.from(token, 'base64url').toString()
    const colonIdx = decoded.lastIndexOf(':')
    if (colonIdx === -1) return false

    const timestamp = decoded.slice(0, colonIdx)
    const sig = decoded.slice(colonIdx + 1)

    const ts = Number(timestamp)
    if (isNaN(ts)) return false
    // Reject expired tokens and tokens from too far in the future (clock skew guard)
    if (Date.now() - ts > ADMIN_TOKEN_TTL_MS) return false
    if (ts > Date.now() + 30_000) return false

    const expected = createHmac('sha256', secret).update(timestamp).digest('hex')
    const expectedBuf = Buffer.from(expected, 'utf8')
    const sigBuf = Buffer.from(sig, 'utf8')
    if (expectedBuf.length !== sigBuf.length) return false

    return timingSafeEqual(expectedBuf, sigBuf)
  } catch {
    return false
  }
}

// ---------------------------------------------------------------------------
// DB row types for $queryRaw results
// ---------------------------------------------------------------------------

interface MarketRow {
  id: string
  slug: string
  name: string
  stateCode: string
  countyName: string | null
  strStatus: string
  permitRequired: string
  ownerOccupancyRequired: string
  summary: string
  notableRestrictions: string | null
}

interface RuleRow {
  ruleKey: string
  label: string
  value: string
  details: string | null
  codeRef: string | null
  codeUrl: string | null
  applicableTo: string
  jurisdictionLevel: string | null
}

interface SourceRow {
  title: string
  url: string
  sourceType: string
  publisher: string | null
  sourceStatus: string
}

// ---------------------------------------------------------------------------
// Rule diff — preserves future alertability without a schema change
// ---------------------------------------------------------------------------

interface RuleDiff {
  added: string[]
  removed: string[]
  changed: Array<{ ruleKey: string; field: string; from: string; to: string }>
}

function computeRuleDiff(
  existingRules: RuleRow[],
  proposedRules: MarketIngestionResult['rules']
): RuleDiff {
  const existingByKey = Object.fromEntries(existingRules.map((r) => [r.ruleKey, r]))
  const proposedByKey = Object.fromEntries(proposedRules.map((r) => [r.ruleKey, r]))

  const added = proposedRules
    .filter((r) => !existingByKey[r.ruleKey])
    .map((r) => r.ruleKey)

  const removed = existingRules
    .filter((r) => !proposedByKey[r.ruleKey])
    .map((r) => r.ruleKey)

  const changed: RuleDiff['changed'] = []
  for (const proposed of proposedRules) {
    const existing = existingByKey[proposed.ruleKey]
    if (!existing) continue
    const fields: Array<[keyof RuleRow, string | null | undefined]> = [
      ['value', proposed.value],
      ['details', proposed.details ?? null],
      ['codeRef', proposed.codeRef ?? null],
      ['codeUrl', proposed.codeUrl ?? null],
    ]
    for (const [field, newVal] of fields) {
      const oldVal = existing[field] ?? null
      const newValNorm = newVal ?? null
      if (oldVal !== newValNorm) {
        changed.push({
          ruleKey: proposed.ruleKey,
          field,
          from: String(oldVal ?? ''),
          to: String(newValNorm ?? ''),
        })
      }
    }
  }

  return { added, removed, changed }
}

// ---------------------------------------------------------------------------
// Request body schema
// ---------------------------------------------------------------------------

const bodySchema = z.object({
  slug: z.string().min(1),
})

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest): Promise<NextResponse> {
  const secret = process.env.AUTH_SECRET
  if (!secret) {
    console.error('[ingest-market] AUTH_SECRET not set')
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  // Verify HMAC admin token
  const authHeader = req.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!verifyAdminToken(token, secret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Parse and validate body
  let rawBody: unknown
  try {
    rawBody = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const parsed = bodySchema.safeParse(rawBody)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid input', issues: parsed.error.issues }, { status: 400 })
  }

  const { slug } = parsed.data

  // Load existing market — scope lock: reject unknown slugs
  const marketRows = await db.$queryRaw<MarketRow[]>`
    SELECT id, slug, name, "stateCode", "countyName", "strStatus",
           "permitRequired", "ownerOccupancyRequired", summary, "notableRestrictions"
    FROM "Market"
    WHERE slug = ${slug}
  `

  if (marketRows.length === 0) {
    return NextResponse.json(
      { error: 'Market not found', detail: 'Only existing markets can be refreshed via this endpoint' },
      { status: 404 }
    )
  }

  const market = marketRows[0]

  // Load existing rules and sources to provide as agent context
  const existingRules = await db.$queryRaw<RuleRow[]>`
    SELECT "ruleKey", label, value, details, "codeRef", "codeUrl", "applicableTo", "jurisdictionLevel"
    FROM "MarketRule"
    WHERE "marketId" = ${market.id}
    ORDER BY "displayOrder"
  `

  const existingSourceRows = await db.$queryRaw<SourceRow[]>`
    SELECT title, url, "sourceType", publisher, "sourceStatus"
    FROM "MarketSource"
    WHERE "marketId" = ${market.id}
    ORDER BY "displayOrder"
  `

  const existingMarket: ExistingMarketContext = {
    slug: market.slug,
    strStatus: market.strStatus,
    permitRequired: market.permitRequired,
    ownerOccupancyRequired: market.ownerOccupancyRequired,
    summary: market.summary,
    notableRestrictions: market.notableRestrictions ?? undefined,
    rules: existingRules.map((r) => ({
      ruleKey: r.ruleKey,
      label: r.label,
      value: r.value,
      details: r.details ?? undefined,
      codeRef: r.codeRef ?? undefined,
      codeUrl: r.codeUrl ?? undefined,
      applicableTo: r.applicableTo,
      jurisdictionLevel: r.jurisdictionLevel ?? undefined,
    })),
    sources: existingSourceRows.map((s) => ({
      title: s.title,
      url: s.url,
      sourceType: s.sourceType,
      publisher: s.publisher ?? undefined,
      sourceStatus: s.sourceStatus,
    })),
  }

  // Run the refresh agent
  let result: MarketIngestionResult
  try {
    result = await runMarketIngestionAgent({
      cityName: market.name,
      stateCode: market.stateCode,
      countyName: market.countyName ?? undefined,
      existingMarket,
    })
  } catch (err) {
    console.error('[ingest-market] Agent error:', err)
    return NextResponse.json({ error: 'Agent failed', detail: String(err) }, { status: 500 })
  }

  // Compute rule diff before replacing — preserves future alertability (see plan)
  const ruleDiff = computeRuleDiff(existingRules, result.rules)

  // Append diff summary to reviewNotes so the human reviewer sees what changed
  if (ruleDiff.added.length > 0) {
    result.reviewNotes.push(`Rules added: ${ruleDiff.added.join(', ')}`)
  }
  if (ruleDiff.removed.length > 0) {
    result.reviewNotes.push(`Rules removed: ${ruleDiff.removed.join(', ')}`)
  }
  if (ruleDiff.changed.length > 0) {
    for (const c of ruleDiff.changed) {
      result.reviewNotes.push(`Rule "${c.ruleKey}" ${c.field} changed: "${c.from}" → "${c.to}"`)
    }
  }
  if (ruleDiff.added.length === 0 && ruleDiff.removed.length === 0 && ruleDiff.changed.length === 0) {
    result.reviewNotes.push('No rule changes detected — existing data confirmed by web_search')
  }

  // UPDATE market top-level fields (slug, name, stateCode, countyName, supportStatus,
  // lastReviewedAt are intentionally NOT updated — human sets lastReviewedAt on approval)
  await db.$executeRaw`
    UPDATE "Market"
    SET
      "strStatus"              = ${result.strStatus},
      "permitRequired"         = ${result.permitRequired},
      "ownerOccupancyRequired" = ${result.ownerOccupancyRequired},
      summary                  = ${result.summary},
      "notableRestrictions"    = ${result.notableRestrictions ?? null},
      "freshnessStatus"        = 'needs_review',
      "updatedAt"              = NOW()
    WHERE id = ${market.id}
  `

  // Replace active rules: DELETE existing → INSERT new (diff already captured above)
  await db.$executeRaw`
    DELETE FROM "MarketRule" WHERE "marketId" = ${market.id}
  `

  for (let i = 0; i < result.rules.length; i++) {
    const rule = result.rules[i]
    const ruleId = randomUUID()
    await db.$executeRaw`
      INSERT INTO "MarketRule" (
        id, "marketId", "ruleKey", label, value, details,
        "codeRef", "codeUrl", "displayOrder", "applicableTo",
        "jurisdictionLevel", "createdAt", "updatedAt"
      ) VALUES (
        ${ruleId},
        ${market.id},
        ${rule.ruleKey},
        ${rule.label},
        ${rule.value},
        ${rule.details ?? null},
        ${rule.codeRef ?? null},
        ${rule.codeUrl ?? null},
        ${i + 1},
        ${rule.applicableTo ?? 'both'},
        ${rule.jurisdictionLevel ?? null},
        NOW(),
        NOW()
      )
    `
  }

  // Replace active sources only — preserve broken/pending_review (source-discoverer workflow)
  await db.$executeRaw`
    DELETE FROM "MarketSource"
    WHERE "marketId" = ${market.id}
      AND "sourceStatus" = 'active'
  `

  for (let i = 0; i < result.sources.length; i++) {
    const source = result.sources[i]
    const sourceId = randomUUID()
    await db.$executeRaw`
      INSERT INTO "MarketSource" (
        id, "marketId", title, url, "sourceType", publisher,
        "displayOrder", "sourceStatus", "createdAt"
      ) VALUES (
        ${sourceId},
        ${market.id},
        ${source.title},
        ${source.url},
        ${source.sourceType},
        ${source.publisher ?? null},
        ${i + 1},
        'active',
        NOW()
      )
    `
  }

  console.log(
    `[ingest-market] Refreshed ${slug} (${market.id}): ${result.rules.length} rules, ${result.sources.length} sources`
  )

  return NextResponse.json({
    marketId: market.id,
    slug,
    confidenceScore: result.confidenceScore,
    reviewNotes: result.reviewNotes,
    ruleCount: result.rules.length,
    sourceCount: result.sources.length,
    ruleDiff,
    result,
  })
}
