// STR Comply — Database Seed Script
//
// Loads all canonical market data into the database.
// Safe to re-run: uses upsert on slug (idempotent).
//
// Usage:
//   npx prisma db seed
//
// To reset and reload from scratch:
//   npx prisma migrate reset   (wipes DB + re-runs migrations + seeds automatically)

import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { markets } from '../../backend/data/markets'
import { computeMarketRulesVersion } from '../lib/market-rules-version'

const pool = new Pool({ connectionString: process.env.DATABASE_URL })
const adapter = new PrismaPg(pool)
const db = new PrismaClient({ adapter })

async function main() {
  console.log('🌱 Seeding STR Comply database...\n')

  for (const market of markets) {
    // Upsert the market itself
    const upserted = await db.market.upsert({
      where: { slug: market.slug },
      create: {
        slug: market.slug,
        name: market.name,
        stateCode: market.stateCode,
        countyName: market.countyName,
        regionLabel: market.regionLabel,
        strStatus: market.strStatus,
        permitRequired: market.permitRequired,
        ownerOccupancyRequired: market.ownerOccupancyRequired,
        freshnessStatus: market.freshnessStatus,
        supportStatus: market.supportStatus,
        summary: market.summary,
        notableRestrictions: market.notableRestrictions,
        lastReviewedAt: new Date(market.lastReviewedAt),
      },
      update: {
        name: market.name,
        stateCode: market.stateCode,
        countyName: market.countyName,
        regionLabel: market.regionLabel,
        strStatus: market.strStatus,
        permitRequired: market.permitRequired,
        ownerOccupancyRequired: market.ownerOccupancyRequired,
        freshnessStatus: market.freshnessStatus,
        supportStatus: market.supportStatus,
        summary: market.summary,
        notableRestrictions: market.notableRestrictions,
        lastReviewedAt: new Date(market.lastReviewedAt),
      },
    })

    // Delete and re-insert child records on each run so edits to
    // rules/sources/aliases are always reflected after re-seeding.
    // MarketRuleSource rows cascade-delete when their parent rule or source is deleted.
    await db.marketAlias.deleteMany({ where: { marketId: upserted.id } })
    await db.marketRule.deleteMany({ where: { marketId: upserted.id } })
    await db.marketSource.deleteMany({ where: { marketId: upserted.id } })

    // Aliases
    if (market.aliases.length > 0) {
      await db.marketAlias.createMany({
        data: market.aliases.map((alias) => ({
          marketId: upserted.id,
          alias: alias.toLowerCase().trim(),
        })),
        skipDuplicates: true,
      })
    }

    // Rules
    if (market.rules.length > 0) {
      await db.marketRule.createMany({
        data: market.rules.map((rule) => ({
          marketId: upserted.id,
          ruleKey: rule.ruleKey,
          label: rule.label,
          value: rule.value,
          details: rule.details,
          codeRef: rule.codeRef,
          codeUrl: rule.codeUrl,
          displayOrder: rule.displayOrder,
          jurisdictionLevel: rule.jurisdictionLevel,
          applicableTo: rule.applicableTo ?? 'both',
        })),
      })
    }

    // Sources
    if (market.sources.length > 0) {
      await db.marketSource.createMany({
        data: market.sources.map((source) => ({
          marketId: upserted.id,
          title: source.title,
          url: source.url,
          sourceType: source.sourceType,
          publisher: source.publisher,
          displayOrder: source.displayOrder,
        })),
      })
    }

    // Rule-source joins: link each rule to its declared sources.
    // Uses $queryRaw/$executeRaw — db.marketRuleSource is undefined with Prisma 7 + driver adapter.
    let joinCount = 0
    for (const ruleData of market.rules) {
      if (!ruleData.linkedSourceTypes?.length) continue
      const rules = await db.$queryRaw<{ id: string }[]>`
        SELECT id FROM "MarketRule"
        WHERE "marketId" = ${upserted.id} AND "ruleKey" = ${ruleData.ruleKey}
        LIMIT 1
      `
      const rule = rules[0]
      if (!rule) continue
      for (const sourceType of ruleData.linkedSourceTypes) {
        const sources = await db.$queryRaw<{ id: string }[]>`
          SELECT id FROM "MarketSource"
          WHERE "marketId" = ${upserted.id} AND "sourceType" = ${sourceType}
          LIMIT 1
        `
        const source = sources[0]
        if (!source) continue
        const newId = (await import('crypto')).randomUUID()
        await db.$executeRaw`
          INSERT INTO "MarketRuleSource" (id, "ruleId", "sourceId")
          VALUES (${newId}, ${rule.id}, ${source.id})
          ON CONFLICT ("ruleId", "sourceId") DO NOTHING
        `
        joinCount++
      }
    }

    // Compute and persist rulesVersion — the invalidation key for cached
    // PropertyRequirements. Anything that changes this hash makes downstream
    // property caches re-generate on next access.
    const rulesVersion = computeMarketRulesVersion({
      strStatus: market.strStatus,
      permitRequired: market.permitRequired,
      ownerOccupancyRequired: market.ownerOccupancyRequired,
      rules: market.rules.map((r) => ({
        ruleKey: r.ruleKey,
        value: r.value,
        details: r.details,
        codeRef: r.codeRef,
        applicableTo: r.applicableTo,
        jurisdictionLevel: r.jurisdictionLevel,
      })),
    })
    await db.market.update({
      where: { id: upserted.id },
      data: { rulesVersion },
    })

    console.log(
      `  ✓ ${market.name} — ${market.rules.length} rules, ${market.sources.length} sources, ${market.aliases.length} aliases, ${joinCount} rule-source links (v ${rulesVersion})`
    )
  }

  console.log(`\n✅ Seeded ${markets.length} markets successfully.`)
}

main()
  .catch((err) => {
    console.error('❌ Seed failed:', err)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
