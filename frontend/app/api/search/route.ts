// GET /api/search?q=<query>
//
// Resolves a user's raw search query to a supported market or returns an
// unsupported response. Handles two input types:
//   1. Market names / aliases — resolved via DB alias/slug/name matching (original path)
//   2. Street addresses — geocoded via Mapbox, resolved to a market by city/county,
//      cached in the Property table so repeat searches skip the Mapbox API call
//
// Response shapes match the SearchResponse type in types/market.ts.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { normalizeQuery } from '@/lib/normalize'
import { geocodeAddress, isAddressQuery, GeocodingError } from '@/lib/geocoding'

// Input schema — q is required, max 200 chars (addresses are longer than city names)
const QuerySchema = z.object({
  q: z.string().min(1, 'Search query is required').max(200, 'Query too long'),
})

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const parseResult = QuerySchema.safeParse({ q: searchParams.get('q') ?? '' })

  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0].message },
      { status: 400 }
    )
  }

  const rawQuery = parseResult.data.q

  try {
    // ── Address path ──────────────────────────────────────────────────────────
    if (isAddressQuery(rawQuery)) {
      return await resolveAddressQuery(rawQuery)
    }

    // ── Market name path (original logic) ────────────────────────────────────
    const normalized = normalizeQuery(rawQuery)
    return await resolveMarketNameQuery(normalized)

  } catch (err) {
    console.error('[/api/search] Error:', err)
    return NextResponse.json(
      { error: 'Search unavailable. Please try again.' },
      { status: 500 }
    )
  }
}

// ── Address resolution ────────────────────────────────────────────────────────

async function resolveAddressQuery(rawAddress: string): Promise<NextResponse> {
  let geocoded: Awaited<ReturnType<typeof geocodeAddress>>

  try {
    geocoded = await geocodeAddress(rawAddress)
  } catch (err) {
    if (err instanceof GeocodingError) {
      // Geocoding failed or token not configured — fall back to market name path
      console.warn('[/api/search] Geocoding failed, falling back to name match:', err.message)
      return resolveMarketNameQuery(normalizeQuery(rawAddress))
    }
    throw err
  }

  // Check Property cache first — if we've geocoded this exact address before,
  // skip the market resolution and return the cached result immediately
  const cached = await db.property.findUnique({
    where: { address: geocoded.normalizedAddress },
    select: {
      latitude: true,
      longitude: true,
      city: true,
      countyName: true,
      marketId: true,
      market: { select: { id: true, slug: true, name: true, strStatus: true, supportStatus: true } },
    },
  })

  if (cached) {
    if (cached.market?.supportStatus === 'supported') {
      return NextResponse.json({
        type: 'supported',
        resolution: 'address',
        market: {
          id: cached.market.id,
          slug: cached.market.slug,
          name: cached.market.name,
          strStatus: cached.market.strStatus,
        },
        property: {
          address: geocoded.normalizedAddress,
          latitude: cached.latitude,
          longitude: cached.longitude,
          city: cached.city,
          countyName: cached.countyName,
        },
        redirectUrl: `/market/${cached.market.slug}`,
      })
    }
    return NextResponse.json({ type: 'unsupported', normalizedQuery: geocoded.city ?? rawAddress })
  }

  // Cache miss — resolve market from geocoded city/county, then cache the result
  const market = geocoded.city ? await resolveMarketFromLocation(geocoded.city, geocoded.stateCode) : null

  await db.property.create({
    data: {
      address: geocoded.normalizedAddress,
      latitude: geocoded.latitude,
      longitude: geocoded.longitude,
      city: geocoded.city,
      stateCode: geocoded.stateCode,
      countyName: geocoded.countyName,
      postalCode: geocoded.postalCode,
      marketId: market?.id ?? null,
    },
  })

  if (market) {
    return NextResponse.json({
      type: 'supported',
      resolution: 'address',
      market: {
        id: market.id,
        slug: market.slug,
        name: market.name,
        strStatus: market.strStatus,
      },
      property: {
        address: geocoded.normalizedAddress,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        city: geocoded.city,
        countyName: geocoded.countyName,
      },
      redirectUrl: `/market/${market.slug}`,
    })
  }

  return NextResponse.json({ type: 'unsupported', normalizedQuery: geocoded.city ?? rawAddress })
}

// Match a geocoded city name to a supported Market.
// Tries alias lookup first (most precise), then name-contains fallback.
async function resolveMarketFromLocation(
  city: string,
  stateCode: string | null
): Promise<{ id: string; slug: string; name: string; strStatus: string } | null> {
  const normalizedCity = normalizeQuery(city)

  // Alias lookup (covers "la", "city of la", "los angeles ca", etc.)
  const aliasMatch = await db.marketAlias.findFirst({
    where: { alias: normalizedCity },
    include: {
      market: {
        select: { id: true, slug: true, name: true, strStatus: true, supportStatus: true },
      },
    },
  })
  if (aliasMatch?.market.supportStatus === 'supported') {
    return aliasMatch.market
  }

  // Name-contains fallback
  const nameMatch = await db.market.findFirst({
    where: {
      supportStatus: 'supported',
      name: { contains: normalizedCity, mode: 'insensitive' },
      ...(stateCode ? { stateCode } : {}),
    },
    select: { id: true, slug: true, name: true, strStatus: true },
  })

  return nameMatch ?? null
}

// ── Market name resolution (original logic, extracted) ────────────────────────

async function resolveMarketNameQuery(normalized: string): Promise<NextResponse> {
  // 1. Exact slug match
  let market = await db.market.findUnique({
    where: { slug: normalized, supportStatus: 'supported' },
    select: { id: true, slug: true, name: true, strStatus: true },
  })

  // 2. Alias match
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

  // 3. Partial name match
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
      resolution: 'market',
      market: {
        id: market.id,
        slug: market.slug,
        name: market.name,
        strStatus: market.strStatus,
      },
      redirectUrl: `/market/${market.slug}`,
    })
  }

  return NextResponse.json({ type: 'unsupported', normalizedQuery: normalized })
}
