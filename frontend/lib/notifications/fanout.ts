// Fan-out: given a MarketChangeEvent, queue Notification rows for every
// watcher of either the affected market OR any property in that market.
//
// Idempotent: upserts on the unique constraint
// (userId, changeEventId, watchKind, watchTargetId), so re-running the
// fan-out for the same event is safe.
//
// Suppression policy:
//  • If user has alertsEnabled=false → write nothing (full opt-out)
//  • If event severity < user.minSeverity → write a Notification with
//    status='suppressed' for audit
//  • Otherwise → write status='queued' for the outbox to drain

import { db } from '@/lib/db'
import { logEvent } from '@/lib/telemetry'
import { severityRank } from './change-event'

interface FanOutResult {
  queued: number
  suppressed: number
  skipped: number // user opted out entirely
}

interface UserPrefs {
  alertsEnabled: boolean
  minSeverity: string
}

const DEFAULT_PREFS: UserPrefs = {
  alertsEnabled: true,
  minSeverity: 'low',
}

async function loadPrefs(userId: string): Promise<UserPrefs> {
  const row = await db.notificationPreference.findUnique({
    where: { userId },
    select: { alertsEnabled: true, minSeverity: true },
  })
  return row ?? DEFAULT_PREFS
}

export async function fanOutChangeEvent(eventId: string): Promise<FanOutResult> {
  const event = await db.marketChangeEvent.findUnique({
    where: { id: eventId },
    select: { id: true, marketId: true, severity: true },
  })
  if (!event) {
    throw new Error(`fanOutChangeEvent: event ${eventId} not found`)
  }

  // Watchers — direct (saved the market) and indirect (saved a property in the market)
  const marketWatchers = await db.watchlistItem.findMany({
    where: { marketId: event.marketId },
    select: { userId: true, marketId: true },
  })

  const propertyWatchers = await db.watchlistItem.findMany({
    where: { property: { marketId: event.marketId } },
    select: { userId: true, propertyId: true },
  })

  const recipients: Array<{
    userId: string
    watchKind: 'market' | 'property'
    watchTargetId: string
  }> = [
    ...marketWatchers
      .filter((w) => w.marketId !== null)
      .map((w) => ({
        userId: w.userId,
        watchKind: 'market' as const,
        watchTargetId: w.marketId!,
      })),
    ...propertyWatchers
      .filter((w) => w.propertyId !== null)
      .map((w) => ({
        userId: w.userId,
        watchKind: 'property' as const,
        watchTargetId: w.propertyId!,
      })),
  ]

  let queued = 0
  let suppressed = 0
  let skipped = 0

  for (const r of recipients) {
    const prefs = await loadPrefs(r.userId)

    if (!prefs.alertsEnabled) {
      skipped++
      continue
    }

    const status =
      severityRank(event.severity) < severityRank(prefs.minSeverity)
        ? 'suppressed'
        : 'queued'

    await db.notification.upsert({
      where: {
        userId_changeEventId_watchKind_watchTargetId: {
          userId: r.userId,
          changeEventId: event.id,
          watchKind: r.watchKind,
          watchTargetId: r.watchTargetId,
        },
      },
      create: {
        userId: r.userId,
        changeEventId: event.id,
        watchKind: r.watchKind,
        watchTargetId: r.watchTargetId,
        status,
      },
      update: {}, // idempotent: existing rows are not touched
    })

    if (status === 'queued') queued++
    else suppressed++
  }

  if (queued > 0) {
    logEvent('notification_queued', {
      metadata: { eventId: event.id, count: queued },
    })
  }

  return { queued, suppressed, skipped }
}
