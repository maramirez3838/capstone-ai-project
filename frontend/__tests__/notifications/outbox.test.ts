/**
 * Tests for lib/notifications/outbox.ts
 *
 * Mocks Resend (a regular function so `new Resend(...)` works as a
 * constructor — per the 2026-04-23 lesson on Anthropic SDK mocks),
 * the Prisma client, and the unsubscribe-token module.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

const sendMock = vi.fn()

vi.mock('resend', () => ({
  Resend: vi.fn(function Resend() {
    return { emails: { send: sendMock } }
  }),
}))

vi.mock('@/lib/db', () => ({
  db: {
    notification: { findMany: vi.fn(), update: vi.fn() },
    marketChangeEvent: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    property: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/telemetry', () => ({
  logEvent: vi.fn(),
}))

import { processOutbox } from '@/lib/notifications/outbox'
import { db } from '@/lib/db'

const mockDb = db as unknown as {
  notification: { findMany: ReturnType<typeof vi.fn>; update: ReturnType<typeof vi.fn> }
  marketChangeEvent: { findUnique: ReturnType<typeof vi.fn> }
  user: { findUnique: ReturnType<typeof vi.fn> }
  property: { findUnique: ReturnType<typeof vi.fn> }
}

const ENV_BACKUP = { ...process.env }

beforeEach(() => {
  vi.clearAllMocks()
  sendMock.mockReset()
  process.env = {
    ...ENV_BACKUP,
    NOTIFICATIONS_ENABLED: 'true',
    RESEND_KEY: 'test-resend-key',
    UNSUBSCRIBE_SECRET: 'test-unsub-secret',
    NEXT_PUBLIC_APP_URL: 'http://localhost:3000',
  }
})

const eventStub = {
  id: 'evt-1',
  severity: 'high',
  changeSummary: { added: ['nightly_cap'], removed: [], changed: [] },
  market: { id: 'mkt-1', slug: 'santa-monica', name: 'Santa Monica' },
}
const userStub = { email: 'user@example.com' }

describe('processOutbox', () => {
  it('short-circuits when NOTIFICATIONS_ENABLED is not "true"', async () => {
    process.env.NOTIFICATIONS_ENABLED = 'false'
    const result = await processOutbox()
    expect(result).toEqual({ sent: 0, failed: 0, deferred: 0, skipped: 1 })
    expect(mockDb.notification.findMany).not.toHaveBeenCalled()
  })

  it('short-circuits when RESEND_KEY is missing', async () => {
    delete process.env.RESEND_KEY
    const result = await processOutbox()
    expect(result.skipped).toBe(1)
    expect(mockDb.notification.findMany).not.toHaveBeenCalled()
  })

  it('sends a queued market notification and marks it sent', async () => {
    mockDb.notification.findMany.mockResolvedValueOnce([
      {
        id: 'notif-1',
        userId: 'u1',
        changeEventId: 'evt-1',
        watchKind: 'market',
        watchTargetId: 'mkt-1',
        status: 'queued',
        attemptCount: 0,
        lastAttemptAt: null,
      },
    ])
    mockDb.marketChangeEvent.findUnique.mockResolvedValueOnce(eventStub)
    mockDb.user.findUnique.mockResolvedValueOnce(userStub)
    sendMock.mockResolvedValueOnce({ id: 'resend-1' })
    mockDb.notification.update.mockResolvedValueOnce({})

    const result = await processOutbox()
    expect(result.sent).toBe(1)
    expect(sendMock).toHaveBeenCalledOnce()
    expect(mockDb.notification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'notif-1' },
        data: expect.objectContaining({ status: 'sent' }),
      })
    )
  })

  it('increments attemptCount on Resend failure (under maxAttempts)', async () => {
    mockDb.notification.findMany.mockResolvedValueOnce([
      {
        id: 'notif-2',
        userId: 'u1',
        changeEventId: 'evt-1',
        watchKind: 'market',
        watchTargetId: 'mkt-1',
        status: 'queued',
        attemptCount: 0,
        lastAttemptAt: null,
      },
    ])
    mockDb.marketChangeEvent.findUnique.mockResolvedValueOnce(eventStub)
    mockDb.user.findUnique.mockResolvedValueOnce(userStub)
    sendMock.mockRejectedValueOnce(new Error('SMTP timeout'))

    const result = await processOutbox()
    expect(result.deferred).toBe(1)
    expect(result.failed).toBe(0)
    const updateArgs = mockDb.notification.update.mock.calls[0][0]
    expect(updateArgs.data.status).toBe('queued')
    expect(updateArgs.data.attemptCount).toBe(1)
    expect(updateArgs.data.failureReason).toContain('SMTP timeout')
  })

  it('marks as failed when attemptCount reaches maxAttempts', async () => {
    mockDb.notification.findMany.mockResolvedValueOnce([
      {
        id: 'notif-3',
        userId: 'u1',
        changeEventId: 'evt-1',
        watchKind: 'market',
        watchTargetId: 'mkt-1',
        status: 'queued',
        attemptCount: 2, // next failure → 3 → failed (maxAttempts default)
        lastAttemptAt: new Date(0), // backoff long passed
      },
    ])
    mockDb.marketChangeEvent.findUnique.mockResolvedValueOnce(eventStub)
    mockDb.user.findUnique.mockResolvedValueOnce(userStub)
    sendMock.mockRejectedValueOnce(new Error('boom'))

    const result = await processOutbox()
    expect(result.failed).toBe(1)
    const updateArgs = mockDb.notification.update.mock.calls[0][0]
    expect(updateArgs.data.status).toBe('failed')
  })

  it('defers notifications still inside the backoff window', async () => {
    mockDb.notification.findMany.mockResolvedValueOnce([
      {
        id: 'notif-4',
        userId: 'u1',
        changeEventId: 'evt-1',
        watchKind: 'market',
        watchTargetId: 'mkt-1',
        status: 'queued',
        attemptCount: 1,
        lastAttemptAt: new Date(), // just attempted — backoff (1m) not elapsed
      },
    ])
    const result = await processOutbox()
    expect(result.deferred).toBe(1)
    expect(sendMock).not.toHaveBeenCalled()
    expect(mockDb.notification.update).not.toHaveBeenCalled()
  })

  it('marks failed when context (event/user) cannot be loaded', async () => {
    mockDb.notification.findMany.mockResolvedValueOnce([
      {
        id: 'notif-5',
        userId: 'u1',
        changeEventId: 'gone',
        watchKind: 'market',
        watchTargetId: 'mkt-1',
        status: 'queued',
        attemptCount: 0,
        lastAttemptAt: null,
      },
    ])
    mockDb.marketChangeEvent.findUnique.mockResolvedValueOnce(null)

    const result = await processOutbox()
    expect(result.failed).toBe(1)
    const updateArgs = mockDb.notification.update.mock.calls[0][0]
    expect(updateArgs.data.failureReason).toBe('context_not_found')
  })
})
