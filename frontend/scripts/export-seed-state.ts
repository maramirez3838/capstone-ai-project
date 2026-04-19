// Export current DB state as markets.ts seed data.
//
// Run this before reseeding to avoid wiping agent-applied changes:
//   npx tsx scripts/export-seed-state.ts > ../backend/data/markets.ts
//
// Review the git diff carefully before reseeding from the new file.
// This script is read-only — it makes no DB writes.

import { configDotenv } from 'dotenv'
import { resolve } from 'path'

configDotenv({ path: resolve(process.cwd(), '.env.local') })

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

// ---------------------------------------------------------------------------
// DB query types
// ---------------------------------------------------------------------------

interface DbMarket {
  id: string
  slug: string
  name: string
  stateCode: string
  countyName: string | null
  regionLabel: string | null
  strStatus: string
  permitRequired: string
  ownerOccupancyRequired: string
  freshnessStatus: string
  supportStatus: string
  summary: string
  notableRestrictions: string | null
  lastReviewedAt: Date
}

interface DbRule {
  ruleKey: string
  label: string
  value: string
  details: string | null
  codeRef: string | null
  codeUrl: string | null
  displayOrder: number
  jurisdictionLevel: string | null
}

interface DbSource {
  title: string
  url: string
  sourceType: string
  publisher: string | null
  displayOrder: number
}

interface DbAlias {
  alias: string
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function defined<T>(val: T | null | undefined): T | undefined {
  return val === null || val === undefined ? undefined : val
}

// Serialize a value as TypeScript-compatible output.
// Omits keys with undefined values (matching optional field semantics).
function toTs(obj: unknown, indent = 0): string {
  if (obj === null || obj === undefined) return 'undefined'
  if (typeof obj === 'string') return JSON.stringify(obj)
  if (typeof obj === 'number' || typeof obj === 'boolean') return String(obj)
  if (Array.isArray(obj)) {
    if (obj.length === 0) return '[]'
    const pad = '  '.repeat(indent + 1)
    const closePad = '  '.repeat(indent)
    const items = obj.map((item) => `${pad}${toTs(item, indent + 1)}`).join(',\n')
    return `[\n${items},\n${closePad}]`
  }
  if (typeof obj === 'object') {
    const rec = obj as Record<string, unknown>
    const entries = Object.entries(rec).filter(([, v]) => v !== undefined)
    if (entries.length === 0) return '{}'
    const pad = '  '.repeat(indent + 1)
    const closePad = '  '.repeat(indent)
    const lines = entries.map(([k, v]) => `${pad}${k}: ${toTs(v, indent + 1)}`).join(',\n')
    return `{\n${lines},\n${closePad}}`
  }
  return String(obj)
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const markets = await db.$queryRaw<DbMarket[]>`
    SELECT id, slug, name, "stateCode", "countyName", "regionLabel",
           "strStatus", "permitRequired", "ownerOccupancyRequired",
           "freshnessStatus", "supportStatus",
           summary, "notableRestrictions", "lastReviewedAt"
    FROM "Market"
    WHERE "supportStatus" != 'archived'
    ORDER BY name
  `

  const output: unknown[] = []

  for (const market of markets) {
    const [rules, sources, aliases] = await Promise.all([
      db.$queryRaw<DbRule[]>`
        SELECT "ruleKey", label, value, details, "codeRef", "codeUrl", "displayOrder", "jurisdictionLevel"
        FROM "MarketRule"
        WHERE "marketId" = ${market.id}
        ORDER BY "displayOrder"
      `,
      db.$queryRaw<DbSource[]>`
        SELECT title, url, "sourceType", publisher, "displayOrder"
        FROM "MarketSource"
        WHERE "marketId" = ${market.id}
          AND "sourceStatus" = 'active'
        ORDER BY "displayOrder"
      `,
      db.$queryRaw<DbAlias[]>`
        SELECT alias FROM "MarketAlias"
        WHERE "marketId" = ${market.id}
        ORDER BY alias
      `,
    ])

    output.push({
      slug: market.slug,
      name: market.name,
      stateCode: market.stateCode,
      ...(market.countyName ? { countyName: market.countyName } : {}),
      ...(market.regionLabel ? { regionLabel: market.regionLabel } : {}),
      strStatus: market.strStatus,
      permitRequired: market.permitRequired,
      ownerOccupancyRequired: market.ownerOccupancyRequired,
      freshnessStatus: market.freshnessStatus,
      supportStatus: market.supportStatus,
      summary: market.summary,
      ...(market.notableRestrictions ? { notableRestrictions: market.notableRestrictions } : {}),
      lastReviewedAt: market.lastReviewedAt.toISOString(),
      aliases: aliases.map((a) => a.alias),
      rules: rules.map((r) => ({
        ruleKey: r.ruleKey,
        label: r.label,
        value: r.value,
        ...(r.details ? { details: r.details } : {}),
        ...(r.codeRef ? { codeRef: r.codeRef } : {}),
        ...(r.codeUrl ? { codeUrl: r.codeUrl } : {}),
        displayOrder: r.displayOrder,
        ...(r.jurisdictionLevel ? { jurisdictionLevel: r.jurisdictionLevel } : {}),
      })),
      sources: sources.map((s) => ({
        title: s.title,
        url: s.url,
        sourceType: s.sourceType,
        ...(s.publisher ? { publisher: s.publisher } : {}),
        displayOrder: s.displayOrder,
      })),
    })
  }

  const fileContent = `// Canonical market seed data for STR Comply
//
// IMPORTANT: This file is the initial seed state.
// Agent-applied changes in production are NOT automatically reflected here.
// Before reseeding, run: npx tsx scripts/export-seed-state.ts > ../backend/data/markets.ts
// Review the git diff carefully before reseeding from this file.
//
// This file is the single source of truth for market content.
// It lives in /backend/data/ so data authoring stays separate from
// framework code — add new markets here, not in /frontend/mocks/.
//
// The seed script at /frontend/prisma/seed.ts imports from this file.
//
// Shape notes:
// - \`aliases\` is a flat string[] here; seed.ts writes each to MarketAlias table
// - \`rules[].codeRef\` and \`rules[].codeUrl\` are included here and written to MarketRule
// - All string enums must match the values documented in schema.prisma
// - \`linkedSourceTypes\` is seed-only metadata and is NOT exported here (not stored in DB)

export interface SeedRule {
  ruleKey: string
  label: string
  value: string
  details?: string
  codeRef?: string
  codeUrl?: string
  displayOrder: number
  jurisdictionLevel?: 'city' | 'county' | 'state'
  linkedSourceTypes?: string[]  // sourceType values of sources that back this rule (seed-only, not stored in DB)
}

export interface SeedSource {
  title: string
  url: string
  sourceType: 'official_program_page' | 'municipal_code' | 'tax_registration' | 'city_ordinance' | 'other'
  publisher?: string
  displayOrder: number
}

export interface SeedMarket {
  slug: string
  name: string
  stateCode: string
  countyName?: string
  regionLabel?: string
  strStatus: 'allowed' | 'conditional' | 'not_allowed'
  permitRequired: 'yes' | 'no' | 'varies'
  ownerOccupancyRequired: 'yes' | 'no' | 'varies'
  freshnessStatus: 'fresh' | 'review_due' | 'needs_review'
  supportStatus: 'supported' | 'unsupported' | 'archived'
  summary: string
  notableRestrictions?: string
  lastReviewedAt: string // ISO 8601
  aliases: string[]
  rules: SeedRule[]
  sources: SeedSource[]
}

export const markets: SeedMarket[] = ${toTs(output)}
`

  process.stdout.write(fileContent)
}

main()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    process.stderr.write(`[export-seed-state] Fatal error: ${String(err)}\n`)
    process.exit(1)
  })
  .finally(() => pool.end())
