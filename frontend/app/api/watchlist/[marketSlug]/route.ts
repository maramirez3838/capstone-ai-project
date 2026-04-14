// DELETE /api/watchlist/:marketSlug
//
// Removes a market from the current user's watchlist by market slug.
// Uses slug (not DB ID) so the FE doesn't need to know internal IDs.
// Idempotent — returns 204 even if the market wasn't saved.
// Requires authentication. Returns 401 until NextAuth is wired in.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

const SlugSchema = z.string().regex(/^[a-z0-9-]+$/, 'Invalid market slug')

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ marketSlug: string }> }
) {
  const user = await requireSession(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { marketSlug } = await params

  const parseResult = SlugSchema.safeParse(marketSlug)
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid market slug' }, { status: 400 })
  }

  try {
    // Look up market by slug to get its ID
    const market = await db.market.findUnique({
      where: { slug: parseResult.data },
      select: { id: true },
    })

    // If market doesn't exist, the item couldn't be saved — treat as already removed
    if (!market) {
      return new NextResponse(null, { status: 204 })
    }

    // deleteMany is idempotent — no error if the row doesn't exist
    await db.watchlistItem.deleteMany({
      where: {
        userId: user.id,
        marketId: market.id,
      },
    })

    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error(`[DELETE /api/watchlist/${marketSlug}] Database error:`, err)
    return NextResponse.json(
      { error: 'Unable to remove market. Please try again.' },
      { status: 500 }
    )
  }
}
