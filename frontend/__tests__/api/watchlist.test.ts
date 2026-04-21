/**
 * Tests for GET and POST /api/watchlist
 *
 * db and requireSession are fully mocked — no database or auth required.
 * To add coverage: import { GET, POST } from '@/app/api/watchlist/route' and add cases below.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  db: {
    market: { findUnique: vi.fn() },
    watchlistItem: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))

vi.mock('@/lib/session', () => ({
  requireSession: vi.fn(),
}))

import { GET, POST } from '@/app/api/watchlist/route'
import { db } from '@/lib/db'
import { requireSession } from '@/lib/session'

const mockDb = db as {
  market: { findUnique: ReturnType<typeof vi.fn> }
  watchlistItem: { findMany: ReturnType<typeof vi.fn>; upsert: ReturnType<typeof vi.fn> }
}
const mockRequireSession = requireSession as ReturnType<typeof vi.fn>

const stubUser = { id: 'user-1', email: 'test@example.com', name: null }

function makeRequest(method: 'GET' | 'POST', body?: object) {
  return new NextRequest('http://localhost:3000/api/watchlist', {
    method,
    ...(body ? { body: JSON.stringify(body), headers: { 'content-type': 'application/json' } } : {}),
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// GET /api/watchlist
// ---------------------------------------------------------------------------
describe('GET /api/watchlist', () => {
  it('returns 401 when not authenticated', async () => {
    mockRequireSession.mockResolvedValueOnce(null)
    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(401)
  })

  it('returns empty array when watchlist is empty', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    mockDb.watchlistItem.findMany.mockResolvedValueOnce([])

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual([])
  })

  it('returns serialized watchlist items', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    mockDb.watchlistItem.findMany.mockResolvedValueOnce([
      {
        createdAt: new Date('2025-01-01'),
        market: {
          slug: 'santa-monica',
          name: 'Santa Monica',
          strStatus: 'conditional',
          countyName: 'Los Angeles',
          freshnessStatus: 'fresh',
          permitRequired: 'yes',
          ownerOccupancyRequired: 'no',
          lastReviewedAt: new Date('2025-01-01'),
        },
      },
    ])

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toHaveLength(1)
    expect(body[0].marketSlug).toBe('santa-monica')
    expect(body[0].market.name).toBe('Santa Monica')
  })
})

// ---------------------------------------------------------------------------
// POST /api/watchlist
// ---------------------------------------------------------------------------
describe('POST /api/watchlist', () => {
  it('returns 401 when not authenticated', async () => {
    mockRequireSession.mockResolvedValueOnce(null)
    const res = await POST(makeRequest('POST', { marketSlug: 'santa-monica' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when body is invalid JSON', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    const req = new NextRequest('http://localhost:3000/api/watchlist', {
      method: 'POST',
      body: 'not-json',
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when marketSlug is missing', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    const res = await POST(makeRequest('POST', {}))
    expect(res.status).toBe(400)
  })

  it('returns 404 when market does not exist', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    mockDb.market.findUnique.mockResolvedValueOnce(null)

    const res = await POST(makeRequest('POST', { marketSlug: 'nonexistent' }))
    expect(res.status).toBe(404)
  })

  it('returns 404 for archived markets', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    mockDb.market.findUnique.mockResolvedValueOnce({ id: 'mkt-1', supportStatus: 'archived' })

    const res = await POST(makeRequest('POST', { marketSlug: 'old-market' }))
    expect(res.status).toBe(404)
  })

  it('returns 201 and upserts on valid request', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    mockDb.market.findUnique.mockResolvedValueOnce({ id: 'mkt-1', supportStatus: 'supported' })
    mockDb.watchlistItem.upsert.mockResolvedValueOnce({})

    const res = await POST(makeRequest('POST', { marketSlug: 'santa-monica' }))
    expect(res.status).toBe(201)
    expect(mockDb.watchlistItem.upsert).toHaveBeenCalledOnce()
  })
})
