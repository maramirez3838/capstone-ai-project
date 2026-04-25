/**
 * Tests for lib/notifications/fanout.ts
 *
 * Validates the suppression policy, idempotent upsert, and the
 * direct-market vs indirect-property watcher path.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    marketChangeEvent: { findUnique: vi.fn() },
    watchlistItem: { findMany: vi.fn() },
    notificationPreference: { findUnique: vi.fn() },
    notification: { upsert: vi.fn() },
  },
}))

vi.mock('@/lib/telemetry', () => ({
  logEvent: vi.fn(),
}))

import { fanOutChangeEvent } from '@/lib/notifications/fanout'
import { db } from '@/lib/db'

const mockDb = db as unknown as {
  marketChangeEvent: { findUnique: ReturnType<typeof vi.fn> }
  watchlistItem: { findMany: ReturnType<typeof vi.fn> }
  notificationPreference: { findUnique: ReturnType<typeof vi.fn> }
  notification: { upsert: ReturnType<typeof vi.fn> }
}

const event = { id: 'evt-1', marketId: 'mkt-1', severity: 'medium' }

beforeEach(() => {
  vi.clearAllMocks()
  mockDb.notification.upsert.mockResolvedValue({})
})

describe('fanOutChangeEvent', () => {
  it('throws when the event is not found', async () => {
    mockDb.marketChangeEvent.findUnique.mockResolvedValueOnce(null)
    await expect(fanOutChangeEvent('missing')).rejects.toThrow(/not found/)
  })

  it('queues notifications for direct market watchers using defaults', async () => {
    mockDb.marketChangeEvent.findUnique.mockResolvedValueOnce(event)
    mockDb.watchlistItem.findMany
      .mockResolvedValueOnce([{ userId: 'u1', marketId: 'mkt-1' }]) // direct
      .mockResolvedValueOnce([]) // indirect
    mockDb.notificationPreference.findUnique.mockResolvedValueOnce(null)

    const result = await fanOutChangeEvent('evt-1')
    expect(result).toEqual({ queued: 1, suppressed: 0, skipped: 0 })
    expect(mockDb.notification.upsert).toHaveBeenCalledOnce()
    const args = mockDb.notification.upsert.mock.calls[0][0]
    expect(args.create.watchKind).toBe('market')
    expect(args.create.status).toBe('queued')
  })

  it('queues notifications for indirect property watchers', async () => {
    mockDb.marketChangeEvent.findUnique.mockResolvedValueOnce(event)
    mockDb.watchlistItem.findMany
      .mockResolvedValueOnce([]) // direct
      .mockResolvedValueOnce([{ userId: 'u2', propertyId: 'prop-1' }]) // indirect
    mockDb.notificationPreference.findUnique.mockResolvedValueOnce(null)

    const result = await fanOutChangeEvent('evt-1')
    expect(result).toEqual({ queued: 1, suppressed: 0, skipped: 0 })
    const args = mockDb.notification.upsert.mock.calls[0][0]
    expect(args.create.watchKind).toBe('property')
    expect(args.create.watchTargetId).toBe('prop-1')
  })

  it('skips users with alertsEnabled=false (no row written)', async () => {
    mockDb.marketChangeEvent.findUnique.mockResolvedValueOnce(event)
    mockDb.watchlistItem.findMany
      .mockResolvedValueOnce([{ userId: 'u3', marketId: 'mkt-1' }])
      .mockResolvedValueOnce([])
    mockDb.notificationPreference.findUnique.mockResolvedValueOnce({
      alertsEnabled: false,
      minSeverity: 'low',
    })

    const result = await fanOutChangeEvent('evt-1')
    expect(result).toEqual({ queued: 0, suppressed: 0, skipped: 1 })
    expect(mockDb.notification.upsert).not.toHaveBeenCalled()
  })

  it('marks notifications as suppressed when below user minSeverity', async () => {
    mockDb.marketChangeEvent.findUnique.mockResolvedValueOnce(event) // medium
    mockDb.watchlistItem.findMany
      .mockResolvedValueOnce([{ userId: 'u4', marketId: 'mkt-1' }])
      .mockResolvedValueOnce([])
    mockDb.notificationPreference.findUnique.mockResolvedValueOnce({
      alertsEnabled: true,
      minSeverity: 'high', // user wants only high — medium is below threshold
    })

    const result = await fanOutChangeEvent('evt-1')
    expect(result).toEqual({ queued: 0, suppressed: 1, skipped: 0 })
    const args = mockDb.notification.upsert.mock.calls[0][0]
    expect(args.create.status).toBe('suppressed')
  })

  it('handles zero watchers cleanly', async () => {
    mockDb.marketChangeEvent.findUnique.mockResolvedValueOnce(event)
    mockDb.watchlistItem.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([])

    const result = await fanOutChangeEvent('evt-1')
    expect(result).toEqual({ queued: 0, suppressed: 0, skipped: 0 })
    expect(mockDb.notification.upsert).not.toHaveBeenCalled()
  })

  it('upserts (not inserts) — re-running for same event/user is idempotent', async () => {
    mockDb.marketChangeEvent.findUnique.mockResolvedValueOnce(event)
    mockDb.watchlistItem.findMany
      .mockResolvedValueOnce([{ userId: 'u5', marketId: 'mkt-1' }])
      .mockResolvedValueOnce([])
    mockDb.notificationPreference.findUnique.mockResolvedValueOnce(null)

    await fanOutChangeEvent('evt-1')
    const args = mockDb.notification.upsert.mock.calls[0][0]
    expect(args.where.userId_changeEventId_watchKind_watchTargetId).toEqual({
      userId: 'u5',
      changeEventId: 'evt-1',
      watchKind: 'market',
      watchTargetId: 'mkt-1',
    })
    expect(args.update).toEqual({}) // no-op on conflict
  })
})
