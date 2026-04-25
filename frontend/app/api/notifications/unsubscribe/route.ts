// GET /api/notifications/unsubscribe?token=...
//
// One-click unsubscribe handler (RFC 8058 friendly: GET-safe within token TTL,
// no auth wall, idempotent). Sets NotificationPreference.alertsEnabled=false
// for the user encoded in the HMAC-signed token. Lazy-creates the row.

import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyUnsubscribeToken } from '@/lib/unsubscribe-token'
import { logEvent } from '@/lib/telemetry'

export async function GET(request: NextRequest) {
  const secret = process.env.UNSUBSCRIBE_SECRET
  if (!secret) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const token = request.nextUrl.searchParams.get('token')
  if (!token) {
    return NextResponse.json({ error: 'Missing token' }, { status: 400 })
  }

  const userId = verifyUnsubscribeToken(token, secret)
  if (!userId) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 400 })
  }

  await db.notificationPreference.upsert({
    where: { userId },
    create: { userId, alertsEnabled: false },
    update: { alertsEnabled: false },
  })

  logEvent('notification_unsubscribed', { metadata: { userId } })

  return new NextResponse(
    `<!doctype html>
<html><head><title>Unsubscribed</title>
<style>body{font-family:system-ui,sans-serif;max-width:480px;margin:64px auto;padding:0 24px;color:#1f2937}</style>
</head><body>
<h1 style="font-size:20px">You're unsubscribed.</h1>
<p>You won't receive any more compliance alert emails. You can re-enable alerts from your account settings any time.</p>
</body></html>`,
    { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } }
  )
}
