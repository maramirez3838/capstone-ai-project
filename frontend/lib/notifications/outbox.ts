// Outbox processor: drains queued Notification rows and dispatches them
// via Resend. Industry-standard alert pipeline with retry + exponential
// backoff (1m, 5m, 30m). Idempotent — multiple concurrent invocations are
// safe because rows transition queued → sent / failed in single UPDATEs.

import { Resend } from 'resend'
import { db } from '@/lib/db'
import { logEvent } from '@/lib/telemetry'
import { renderMarketEmail, renderPropertyEmail } from './email-templates'
import type { RuleDiff } from './change-event'
import { buildPropertyHref } from '@/lib/property-urls'

const DEFAULT_BATCH = 50
const DEFAULT_MAX_ATTEMPTS = 3
const BACKOFF_MS = [0, 60_000, 300_000, 1_800_000] // 0, 1m, 5m, 30m

const FROM_ADDRESS = 'STR Comply <onboarding@resend.dev>'

interface ProcessResult {
  sent: number
  failed: number
  deferred: number
  skipped: number
}

interface ProcessOpts {
  batchSize?: number
  maxAttempts?: number
}

export async function processOutbox(opts: ProcessOpts = {}): Promise<ProcessResult> {
  const result: ProcessResult = { sent: 0, failed: 0, deferred: 0, skipped: 0 }

  if (process.env.NOTIFICATIONS_ENABLED !== 'true') {
    result.skipped = 1
    return result
  }

  const apiKey = process.env.RESEND_KEY
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const unsubSecret = process.env.UNSUBSCRIBE_SECRET
  if (!apiKey || !unsubSecret) {
    console.warn('[outbox] RESEND_KEY or UNSUBSCRIBE_SECRET missing — skipping')
    result.skipped = 1
    return result
  }

  const resend = new Resend(apiKey)
  const batchSize = opts.batchSize ?? DEFAULT_BATCH
  const maxAttempts = opts.maxAttempts ?? DEFAULT_MAX_ATTEMPTS

  const candidates = await db.notification.findMany({
    where: { status: 'queued', attemptCount: { lt: maxAttempts } },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  })

  const now = Date.now()

  for (const n of candidates) {
    // Backoff gate
    const wait = BACKOFF_MS[Math.min(n.attemptCount, BACKOFF_MS.length - 1)]
    if (n.lastAttemptAt && now - n.lastAttemptAt.getTime() < wait) {
      result.deferred++
      continue
    }

    try {
      const ctx = await loadContext(n)
      if (!ctx) {
        // The change event or user/target was deleted — drop the notification.
        await db.notification.update({
          where: { id: n.id },
          data: { status: 'failed', failureReason: 'context_not_found', lastAttemptAt: new Date() },
        })
        result.failed++
        continue
      }

      const rendered =
        n.watchKind === 'market'
          ? renderMarketEmail(
              {
                appBaseUrl: baseUrl,
                marketName: ctx.market.name,
                marketSlug: ctx.market.slug,
                diff: ctx.diff,
                severity: ctx.severity,
              },
              ctx.userId,
              unsubSecret
            )
          : renderPropertyEmail(
              {
                appBaseUrl: baseUrl,
                marketName: ctx.market.name,
                marketSlug: ctx.market.slug,
                diff: ctx.diff,
                severity: ctx.severity,
                propertyAddress: ctx.property!.address,
                propertyHref: buildPropertyHref({
                  address: ctx.property!.address,
                  marketId: ctx.market.id,
                  lat: ctx.property!.latitude,
                  lon: ctx.property!.longitude,
                  slug: ctx.market.slug,
                  marketName: ctx.market.name,
                }),
              },
              ctx.userId,
              unsubSecret
            )

      await resend.emails.send({
        from: FROM_ADDRESS,
        to: ctx.userEmail,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      })

      await db.notification.update({
        where: { id: n.id },
        data: { status: 'sent', sentAt: new Date(), lastAttemptAt: new Date() },
      })

      logEvent('notification_sent', {
        metadata: { notificationId: n.id, watchKind: n.watchKind },
      })
      result.sent++
    } catch (err) {
      const newAttempts = n.attemptCount + 1
      const status = newAttempts >= maxAttempts ? 'failed' : 'queued'
      await db.notification.update({
        where: { id: n.id },
        data: {
          status,
          attemptCount: newAttempts,
          lastAttemptAt: new Date(),
          failureReason: String(err instanceof Error ? err.message : err).slice(0, 500),
        },
      })
      if (status === 'failed') result.failed++
      else result.deferred++
    }
  }

  return result
}

// ── Context loader ─────────────────────────────────────────────────────────

interface OutboxContext {
  userId: string
  userEmail: string
  diff: RuleDiff
  severity: string
  market: { id: string; slug: string; name: string }
  property: { address: string; latitude: number; longitude: number } | null
}

async function loadContext(n: {
  userId: string
  changeEventId: string
  watchKind: string
  watchTargetId: string
}): Promise<OutboxContext | null> {
  const event = await db.marketChangeEvent.findUnique({
    where: { id: n.changeEventId },
    include: {
      market: { select: { id: true, slug: true, name: true } },
    },
  })
  if (!event) return null

  const user = await db.user.findUnique({
    where: { id: n.userId },
    select: { email: true },
  })
  if (!user) return null

  let property: OutboxContext['property'] = null
  if (n.watchKind === 'property') {
    const p = await db.property.findUnique({
      where: { id: n.watchTargetId },
      select: { address: true, latitude: true, longitude: true },
    })
    if (!p) return null
    property = p
  }

  return {
    userId: n.userId,
    userEmail: user.email,
    diff: event.changeSummary as unknown as RuleDiff,
    severity: event.severity,
    market: event.market,
    property,
  }
}
