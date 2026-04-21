// POST /api/telemetry
//
// Logs a user event for analytics. Fire-and-forget from the client —
// this endpoint always returns 204 and never propagates errors to the caller.
// If the DB write fails, it logs server-side but doesn't fail the request.
//
// Anonymous events are supported: userId is optional (not yet known until auth).

import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { db } from '@/lib/db'

// Valid event names — adding a new event requires updating this enum
const TelemetryEventSchema = z.object({
  eventName: z.enum([
    'search_performed',
    'result_viewed',
    'source_clicked',
    'market_saved',
    'market_removed',
    'unsupported_market_seen',
  ]),
  marketSlug: z.string().max(100).optional(),
  queryText: z.string().max(200).optional(),
  sessionId: z.string().max(100).optional(),
  // metadata is stored as JSON — accept any object but cap size to prevent abuse
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export async function POST(request: NextRequest) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    // Malformed JSON — still return 204 (fire-and-forget, never fail client)
    return new NextResponse(null, { status: 204 })
  }

  const parseResult = TelemetryEventSchema.safeParse(body)
  if (!parseResult.success) {
    // Unknown event name or invalid shape — reject with 400 to catch bugs in FE code
    return NextResponse.json(
      { error: parseResult.error.issues[0].message },
      { status: 400 }
    )
  }

  const { eventName, marketSlug, queryText, sessionId, metadata } = parseResult.data

  // Look up the market ID if a slug was provided — but don't fail if not found
  let marketId: string | null = null
  if (marketSlug) {
    try {
      const market = await db.market.findUnique({
        where: { slug: marketSlug },
        select: { id: true },
      })
      marketId = market?.id ?? null
    } catch {
      // Don't block telemetry write if market lookup fails
    }
  }

  try {
    await db.telemetryEvent.create({
      data: {
        eventName,
        marketId,
        queryText: queryText ?? null,
        sessionId: sessionId ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metadataJson: metadata as any,
        // userId is null until auth is wired — that's expected
        userId: null,
      },
    })
  } catch (err) {
    // Log server-side but never fail the client — telemetry is non-critical
    console.error('[/api/telemetry] Write failed:', err)
  }

  return new NextResponse(null, { status: 204 })
}
