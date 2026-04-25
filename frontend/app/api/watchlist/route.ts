// GET  /api/watchlist  — list saved markets and properties for the current user
// POST /api/watchlist  — save a market OR a property to the watchlist
//
// POST body is a polymorphic union: either { marketSlug } or { propertyAddress }.
// Exactly one is required (XOR enforced by the schema).
// GET returns { markets: [...], properties: [...] } so the listing page can
// surface them as independent tabs.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

const MarketSaveSchema = z.object({ marketSlug: z.string().min(1).max(100) })
const PropertySaveSchema = z.object({ propertyAddress: z.string().min(1).max(300) })
const SaveSchema = z.union([MarketSaveSchema, PropertySaveSchema])

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
        property: {
          select: {
            id: true,
            address: true,
            latitude: true,
            longitude: true,
            city: true,
            stateCode: true,
            countyName: true,
            marketId: true,
            requirementsGeneratedAt: true,
            market: {
              select: {
                slug: true,
                name: true,
                strStatus: true,
                freshnessStatus: true,
                lastReviewedAt: true,
              },
            },
          },
        },
      },
    })

    const markets = items
      .filter((i) => i.market !== null)
      .map((i) => ({
        marketSlug: i.market!.slug,
        savedAt: i.createdAt.toISOString(),
        market: {
          name: i.market!.name,
          strStatus: i.market!.strStatus,
          countyName: i.market!.countyName,
          freshnessStatus: i.market!.freshnessStatus,
          permitRequired: i.market!.permitRequired,
          ownerOccupancyRequired: i.market!.ownerOccupancyRequired,
          lastReviewedAt: i.market!.lastReviewedAt.toISOString(),
        },
      }))

    const properties = items
      .filter((i) => i.property !== null)
      .map((i) => ({
        propertyId: i.property!.id,
        address: i.property!.address,
        savedAt: i.createdAt.toISOString(),
        property: {
          latitude: i.property!.latitude,
          longitude: i.property!.longitude,
          city: i.property!.city,
          stateCode: i.property!.stateCode,
          countyName: i.property!.countyName,
          marketId: i.property!.marketId,
          requirementsGeneratedAt: i.property!.requirementsGeneratedAt?.toISOString() ?? null,
          market: i.property!.market
            ? {
                slug: i.property!.market.slug,
                name: i.property!.market.name,
                strStatus: i.property!.market.strStatus,
                freshnessStatus: i.property!.market.freshnessStatus,
                lastReviewedAt: i.property!.market.lastReviewedAt.toISOString(),
              }
            : null,
        },
      }))

    return NextResponse.json({ markets, properties })
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

  const data = parseResult.data

  try {
    if ('marketSlug' in data) {
      const market = await db.market.findUnique({
        where: { slug: data.marketSlug },
        select: { id: true, supportStatus: true },
      })
      if (!market || market.supportStatus === 'archived') {
        return NextResponse.json({ error: 'Market not found' }, { status: 404 })
      }
      await db.watchlistItem.upsert({
        where: { userId_marketId: { userId: user.id, marketId: market.id } },
        create: { userId: user.id, marketId: market.id },
        update: {},
      })
      return new NextResponse(null, { status: 201 })
    }

    // Property branch
    const property = await db.property.findUnique({
      where: { address: data.propertyAddress },
      select: { id: true },
    })
    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }
    await db.watchlistItem.upsert({
      where: { userId_propertyId: { userId: user.id, propertyId: property.id } },
      create: { userId: user.id, propertyId: property.id },
      update: {},
    })
    return new NextResponse(null, { status: 201 })
  } catch (err) {
    console.error('[POST /api/watchlist] Database error:', err)
    return NextResponse.json(
      { error: 'Unable to save. Please try again.' },
      { status: 500 }
    )
  }
}
