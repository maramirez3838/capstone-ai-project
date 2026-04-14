// GET /api/search?q=<query>
//
// Resolves a user's raw search query to a supported market or returns an
// unsupported response. The FE uses this to decide whether to navigate to
// a market detail page or the unsupported page.
//
// Response shapes match the SearchResponse type in types/market.ts.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

// Input schema — q is required, max 100 chars to prevent abuse
const QuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(100, 'Query too long'),
})

// Normalize a search string the same way the FE does in lib/search.ts
function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
}

export async function GET(request: NextRequest) {
  // Parse and validate the query param
  const { searchParams } = request.nextUrl
  const parseResult = QuerySchema.safeParse({ q: searchParams.get('q') ?? '' })

  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0].message },
      { status: 400 }
    )
  }

  const rawQuery = parseResult.data.q
  const normalized = normalizeQuery(rawQuery)

  try {
    // 1. Try exact slug match
    let market = await db.market.findUnique({
      where: { slug: normalized, supportStatus: 'supported' },
      select: { id: true, slug: true, name: true, strStatus: true },
    })

    // 2. Try alias match (the primary lookup path for human-typed queries)
    if (!market) {
      const aliasMatch = await db.marketAlias.findFirst({
        where: { alias: normalized },
        include: {
          market: {
            select: { id: true, slug: true, name: true, strStatus: true, supportStatus: true },
          },
        },
      })
      if (aliasMatch?.market.supportStatus === 'supported') {
        market = aliasMatch.market
      }
    }

    // 3. Try partial name match (fallback — less precise)
    if (!market) {
      market = await db.market.findFirst({
        where: {
          supportStatus: 'supported',
          name: { contains: normalized, mode: 'insensitive' },
        },
        select: { id: true, slug: true, name: true, strStatus: true },
      })
    }

    if (market) {
      return NextResponse.json({
        type: 'supported',
        market: {
          id: market.id,
          slug: market.slug,
          name: market.name,
          strStatus: market.strStatus,
        },
        redirectUrl: `/market/${market.slug}`,
      })
    }

    // No match found
    return NextResponse.json({
      type: 'unsupported',
      normalizedQuery: normalized,
    })
  } catch (err) {
    console.error('[/api/search] Database error:', err)
    return NextResponse.json(
      { error: 'Search unavailable. Please try again.' },
      { status: 500 }
    )
  }
}
