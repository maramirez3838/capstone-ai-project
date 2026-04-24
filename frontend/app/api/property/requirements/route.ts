// GET /api/property/requirements?address=...&marketId=...&lat=...&lon=...
//
// Returns property-level STR compliance requirements for a specific geocoded address
// within a supported market. Requires the address to already be cached in the Property
// table (i.e. /api/search must have resolved it first).
//
// Response includes disclaimerRequired: true — callers must render the Disclaimer component.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import { runPropertyRequirementsAgent } from '@/lib/agents/property-requirements-agent'

const QuerySchema = z.object({
  address: z.string().min(1, 'address is required').max(300),
  marketId: z.string().min(1, 'marketId is required'),
  lat: z.coerce.number({ message: 'lat must be a valid number' }),
  lon: z.coerce.number({ message: 'lon must be a valid number' }),
})

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl
  const parseResult = QuerySchema.safeParse({
    address: searchParams.get('address') ?? '',
    marketId: searchParams.get('marketId') ?? '',
    lat: searchParams.get('lat') ?? '',
    lon: searchParams.get('lon') ?? '',
  })

  if (!parseResult.success) {
    return NextResponse.json(
      { error: parseResult.error.issues[0].message },
      { status: 400 }
    )
  }

  const { address, marketId, lat, lon } = parseResult.data

  // Verify property is in cache — it must have been resolved by /api/search first
  const property = await db.property.findUnique({ where: { address } })
  if (!property) {
    return NextResponse.json(
      { error: 'Property not found in cache. Run an address search first via /api/search.' },
      { status: 404 }
    )
  }

  try {
    const result = await runPropertyRequirementsAgent({
      address,
      marketId,
      latitude: lat,
      longitude: lon,
    })

    return NextResponse.json({
      ...result,
      disclaimerRequired: true,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'

    // Distinguish missing API key (503), bad marketId (404), other failures (500)
    if (message.includes('ANTHROPIC_API_KEY is not configured')) {
      return NextResponse.json(
        { error: 'Requirements lookup unavailable', details: message },
        { status: 503 }
      )
    }

    if (message.startsWith('Market not found:')) {
      return NextResponse.json({ error: message }, { status: 404 })
    }

    return NextResponse.json(
      { error: 'Requirements lookup failed', details: message },
      { status: 500 }
    )
  }
}
