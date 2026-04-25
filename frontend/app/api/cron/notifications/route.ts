// GET /api/cron/notifications
//
// Vercel cron entry point — drains the notification outbox.
// Off by default: requires NOTIFICATIONS_ENABLED=true. Mirrors the
// COMPLIANCE_MONITOR_ENABLED posture so unfinished plumbing never sends
// real emails by accident.

import { NextResponse } from 'next/server'
import { processOutbox } from '@/lib/notifications/outbox'

export async function GET() {
  try {
    const result = await processOutbox()
    return NextResponse.json(result)
  } catch (err) {
    console.error('[cron/notifications] Unexpected failure:', err)
    return NextResponse.json(
      { error: 'Outbox processing failed' },
      { status: 500 }
    )
  }
}
