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

    console.log(
      `  ✓ ${market.name} — ${market.rules.length} rules, ${market.sources.length} sources, ${market.aliases.length} aliases`
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
