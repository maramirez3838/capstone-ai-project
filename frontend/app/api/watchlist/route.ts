// GET /api/watchlist    — list saved markets for the current user
// POST /api/watchlist   — save a market to the current user's watchlist
//
// Both routes require authentication. Until NextAuth is wired in,
// requireSession() returns null and every request receives a 401.
// When auth is added, only lib/session.ts changes — this file stays the same.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

const SaveSchema = z.object({
  marketSlug: z.string().min(1).max(100),
})

// GET /api/watchlist
export async function GET(request: NextRequest) {
  const user = await requireSession(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  try {
    const items = await db.watchlistItem.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: 'desc' },
      include: {
        market: {
          select: {
            slug: true,
            name: true,
            strStatus: true,
            countyName: true,
            freshnessStatus: true,
            permitRequired: true,
            ownerOccupancyRequired: true,
            lastReviewedAt: true,
          },
        },
      },
    })

    return NextResponse.json(
      items.map((item: (typeof items)[number]) => ({
        marketSlug: item.market.slug,
        savedAt: item.createdAt.toISOString(),
        market: {
          name: item.market.name,
          strStatus: item.market.strStatus,
          countyName: item.market.countyName,
          freshnessStatus: item.market.freshnessStatus,
          permitRequired: item.market.permitRequired,
          ownerOccupancyRequired: item.market.ownerOccupancyRequired,
          lastReviewedAt: item.market.lastReviewedAt.toISOString(),
        },
      }))
    )
  } catch (err) {
    console.error('[GET /api/watchlist] Database error:', err)
    return NextResponse.json(
      { error: 'Unable to load watchlist. Please try again.' },
      { status: 500 }
    )
  }
}

// POST /api/watchlist
export async function POST(request: NextRequest) {
  const user = await requireSession(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const parseResult = SaveSchema.safeParse(body)
  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0].message },
      { status: 400 }
    )
  }

  const { marketSlug } = parseResult.data

  try {
    // Look up the market — reject unknown slugs
    const market = await db.market.findUnique({
      where: { slug: marketSlug },
      select: { id: true, supportStatus: true },
    })

    if (!market || market.supportStatus === 'archived') {
      return NextResponse.json({ error: 'Market not found' }, { status: 404 })
    }

    // Upsert — silently succeeds if already saved
    await db.watchlistItem.upsert({
      where: { userId_marketId: { userId: user.id, marketId: market.id } },
      create: { userId: user.id, marketId: market.id },
      update: {}, // nothing to update — createdAt stays as the original save date
    })

    return new NextResponse(null, { status: 201 })
  } catch (err) {
    console.error('[POST /api/watchlist] Database error:', err)
    return NextResponse.json(
      { error: 'Unable to save market. Please try again.' },
      { status: 500 }
    )
  }
}
