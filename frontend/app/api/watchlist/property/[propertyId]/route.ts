// DELETE /api/watchlist/property/:propertyId
//
// Removes a saved property from the current user's watchlist by property ID
// (cuid). Mirrors the market DELETE handler — auth-gated, idempotent, returns
// 204 even if the row didn't exist. Property cuids are used in the URL because
// addresses are long and contain spaces/commas.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

// cuid format: c + 24 lowercase alphanumerics (Prisma's @default(cuid()))
const CuidSchema = z.string().regex(/^c[a-z0-9]{24}$/, 'Invalid property id')

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ propertyId: string }> }
) {
  const user = await requireSession(request)
  if (!user) {
    return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
  }

  const { propertyId } = await params

  const parseResult = CuidSchema.safeParse(propertyId)
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Invalid property id' }, { status: 400 })
  }

  try {
    await db.watchlistItem.deleteMany({
      where: { userId: user.id, propertyId: parseResult.data },
    })
    return new NextResponse(null, { status: 204 })
  } catch (err) {
    console.error(`[DELETE /api/watchlist/property/${propertyId}] Database error:`, err)
    return NextResponse.json(
      { error: 'Unable to remove property. Please try again.' },
      { status: 500 }
    )
  }
}
