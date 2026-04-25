/**
 * Tests for GET /api/notifications/unsubscribe
 *
 * Validates the HMAC token round-trip + lazy-init upsert.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  db: {
    notificationPreference: { upsert: vi.fn() },
  },
}))

vi.mock('@/lib/telemetry', () => ({
  logEvent: vi.fn(),
}))

import { GET } from '@/app/api/notifications/unsubscribe/route'
import { db } from '@/lib/db'
import { signUnsubscribeToken } from '@/lib/unsubscribe-token'

const mockDb = db as unknown as {
  notificationPreference: { upsert: ReturnType<typeof vi.fn> }
}

const ENV_BACKUP = { ...process.env }
const SECRET = 'test-unsub-secret-1234567890'

beforeEach(() => {
  vi.clearAllMocks()
  process.env = { ...ENV_BACKUP, UNSUBSCRIBE_SECRET: SECRET }
})

function makeReq(query: string) {
  return new NextRequest(`http://localhost:3000/api/notifications/unsubscribe?${query}`)
}

describe('GET /api/notifications/unsubscribe', () => {
  it('returns 500 when UNSUBSCRIBE_SECRET is missing', async () => {
    delete process.env.UNSUBSCRIBE_SECRET
    const res = await GET(makeReq('token=anything'))
    expect(res.status).toBe(500)
  })

  it('returns 400 when token is missing', async () => {
    const res = await GET(makeReq(''))
    expect(res.status).toBe(400)
  })

  it('returns 400 when token is malformed', async () => {
    const res = await GET(makeReq('token=garbage'))
    expect(res.status).toBe(400)
  })

  it('returns 400 when token is signed with a different secret', async () => {
    const wrongToken = signUnsubscribeToken('user-1', 'different-secret')
    const res = await GET(makeReq(`token=${encodeURIComponent(wrongToken)}`))
    expect(res.status).toBe(400)
  })

  it('returns 200 HTML and disables alerts for a valid token', async () => {
    mockDb.notificationPreference.upsert.mockResolvedValueOnce({})
    const token = signUnsubscribeToken('user-1', SECRET)
    const res = await GET(makeReq(`token=${encodeURIComponent(token)}`))

    expect(res.status).toBe(200)
    expect(res.headers.get('content-type')).toContain('text/html')
    expect(mockDb.notificationPreference.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', alertsEnabled: false },
      update: { alertsEnabled: false },
    })
  })

  it('is idempotent — re-clicking is still 200', async () => {
    mockDb.notificationPreference.upsert.mockResolvedValue({})
    const token = signUnsubscribeToken('user-1', SECRET)

    const res1 = await GET(makeReq(`token=${encodeURIComponent(token)}`))
    const res2 = await GET(makeReq(`token=${encodeURIComponent(token)}`))
    expect(res1.status).toBe(200)
    expect(res2.status).toBe(200)
    expect(mockDb.notificationPreference.upsert).toHaveBeenCalledTimes(2)
  })
})
