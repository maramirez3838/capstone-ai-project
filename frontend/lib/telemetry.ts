// Telemetry stub — UI phase only.
// Logs to console during development.
// Replace console.log with a real POST /api/telemetry call when BE joins.

type TelemetryEvent =
  | 'search_performed'
  | 'result_viewed'
  | 'source_clicked'
  | 'market_saved'
  | 'market_removed'
  | 'unsupported_market_seen'

interface TelemetryPayload {
  marketSlug?: string
  queryText?: string
  metadata?: Record<string, unknown>
}

export function logEvent(
  event: TelemetryEvent,
  payload: TelemetryPayload = {}
): void {
  // TODO(BE): replace with POST /api/telemetry
  console.log('[telemetry]', event, { ...payload, ts: new Date().toISOString() })
}
