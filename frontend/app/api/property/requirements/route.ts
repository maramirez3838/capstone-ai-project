// GET /api/property/requirements?address=...&marketId=...&lat=...&lon=...
//
// Returns property-level STR compliance requirements for a specific geocoded address
// within a supported market. Requires the address to already be cached in the Property
// table (i.e. /api/search must have resolved it first).
//
// Caching strategy:
//   - The agent's output is persisted on the Property row (requirementsJson, etc.).
//   - Validity is keyed on Market.rulesVersion. If the market's rulesVersion matches
//     the snapshot stored on the property, the cached row is returned without an
//     agent call. If they differ (or no cache exists yet), the agent runs and the
//     result is persisted with the current rulesVersion.
//   - rulesVersion is bumped by the seed and by the Market Refresh Agent — those
//     are the only paths that should change a market's rules, which matches the
//     product principle that monitor agents are the only reason existing data
//     updates.
//
// Response includes disclaimerRequired: true — callers must render the Disclaimer.

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'
import {
  runPropertyRequirementsAgent,
  type PropertyRequirementsResult,
} from '@/lib/agents/property-requirements-agent'

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

  // Read the parent market's current rulesVersion — this is the cache key.
  const market = await db.market.findUnique({
    where: { id: marketId },
    select: { rulesVersion: true },
  })

  // Cache hit: cached requirements exist AND the market's rulesVersion hasn't moved.
  // A null rulesVersion on either side means "not yet computed" — treat as miss so
  // we generate fresh and persist a real version.
  const hasCachedAgentOutput =
    property.requirementsJson !== null &&
    property.requirementsRulesVersion !== null

  const cacheValid =
    hasCachedAgentOutput &&
    market?.rulesVersion !== null &&
    market?.rulesVersion === property.requirementsRulesVersion

  if (cacheValid) {
    return NextResponse.json({
      address: property.address,
      marketId,
      requirements: property.requirementsJson,
      confidenceNote: property.requirementsConfidenceNote ?? '',
      reviewFlags: property.requirementsReviewFlags ?? [],
      cached: true,
      cachedAt: property.requirementsGeneratedAt?.toISOString() ?? null,
      rulesVersion: property.requirementsRulesVersion,
      disclaimerRequired: true,
    })
  }

  // Cache miss or stale — run the agent and persist the result.
  let result: PropertyRequirementsResult
  try {
    result = await runPropertyRequirementsAgent({
      address,
      marketId,
      latitude: lat,
      longitude: lon,
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

  // Persist the agent output snapshot. We tag it with the market's current
  // rulesVersion so the next read can do a cheap equality check.
  await db.property.update({
    where: { id: property.id },
    data: {
      requirementsJson: result.requirements as never,
      requirementsConfidenceNote: result.confidenceNote ?? null,
      requirementsReviewFlags: result.reviewFlags ?? [],
      requirementsGeneratedAt: new Date(),
      requirementsRulesVersion: market?.rulesVersion ?? null,
    },
  })

  return NextResponse.json({
    ...result,
    cached: false,
    rulesVersion: market?.rulesVersion ?? null,
    disclaimerRequired: true,
  })
}
