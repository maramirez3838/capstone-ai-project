// Telemetry — sends user events to POST /api/telemetry.
// Fire-and-forget: errors are swallowed so a telemetry failure
// never interrupts the user's workflow.

export type TelemetryEventName =
  | 'search_performed'
  | 'result_viewed'
  | 'source_clicked'
  | 'market_saved'
  | 'market_removed'
  | 'unsupported_market_seen'

interface TelemetryPayload {
  marketSlug?: string
  queryText?: string
  sessionId?: string
  metadata?: Record<string, unknown>
}

export function logEvent(
  event: TelemetryEventName,
  payload: TelemetryPayload = {}
): void {
  // Fire-and-forget — do not await, do not surface errors to the caller
  fetch('/api/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      eventName: event,
      marketSlug: payload.marketSlug,
      queryText: payload.queryText,
      sessionId: payload.sessionId,
      metadata: payload.metadata,
    }),
  }).catch(() => {
    // Silently discard — telemetry must never break user-facing features
  })
}
