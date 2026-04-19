// GET /api/markets/:slug
//
// Returns the full compliance record for one market including all rules
// (ordered by displayOrder) and all sources (ordered by displayOrder).
//
// Response shape matches the Market interface in types/market.ts, with
// `aliases` omitted (FE-only field, not stored on the BE market model).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

// Slug must be URL-safe: lowercase letters, numbers, hyphens only
const SlugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Invalid market slug')

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params

  // Validate slug shape before hitting the DB
  const parseResult = SlugSchema.safeParse(slug)
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid market slug' }, { status: 400 })
  }

  try {
    const market = await db.market.findUnique({
      where: { slug: parseResult.data },
      include: {
        rules: {
          orderBy: { displayOrder: 'asc' },
          include: {
            linkedSources: { include: { source: true } },
          },
        },
        sources: { orderBy: { displayOrder: 'asc' } },
      },
    })

    if (!market || market.supportStatus === 'archived') {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    // Map DB record to the API response shape
    return NextResponse.json({
      id: market.id,
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
      lastReviewedAt: market.lastReviewedAt.toISOString(),
      rules: market.rules.map((r) => ({
        ruleKey: r.ruleKey,
        label: r.label,
        value: r.value,
        details: r.details,
        codeRef: r.codeRef,
        codeUrl: r.codeUrl,
        displayOrder: r.displayOrder,
        jurisdictionLevel: r.jurisdictionLevel,
        sources: r.linkedSources.map((ls) => ({
          id: ls.source.id,
          title: ls.source.title,
          url: ls.source.url,
          sourceType: ls.source.sourceType,
          publisher: ls.source.publisher,
          displayOrder: ls.source.displayOrder,
        })),
      })),
      sources: market.sources.map((s) => ({
        id: s.id,
        title: s.title,
        url: s.url,
        sourceType: s.sourceType,
        publisher: s.publisher,
        displayOrder: s.displayOrder,
      })),
    })
  } catch (err) {
    console.error(`[/api/markets/${slug}] Database error:`, err)
    return NextResponse.json(
      { error: 'Unable to load market data. Please try again.' },
      { status: 500 }
    )
  }
}
