/**
 * Tests for GET and POST /api/watchlist
 *
 * db and requireSession are fully mocked — no database or auth required.
 * GET returns { markets, properties }. POST accepts a discriminated union:
 * { marketSlug } or { propertyAddress }. Property-DELETE coverage lives in
 * watchlist-property.test.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  db: {
    market: { findUnique: vi.fn() },
    property: { findUnique: vi.fn() },
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

const mockDb = db as unknown as {
  market: { findUnique: ReturnType<typeof vi.fn> }
  property: { findUnique: ReturnType<typeof vi.fn> }
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

  it('returns empty lists when watchlist is empty', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    mockDb.watchlistItem.findMany.mockResolvedValueOnce([])

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body).toEqual({ markets: [], properties: [] })
  })

  it('serializes market and property entries into separate lists', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    mockDb.watchlistItem.findMany.mockResolvedValueOnce([
      {
        createdAt: new Date('2026-04-20'),
        market: {
          slug: 'santa-monica',
          name: 'Santa Monica',
          strStatus: 'conditional',
          countyName: 'Los Angeles',
          freshnessStatus: 'fresh',
          permitRequired: 'yes',
          ownerOccupancyRequired: 'no',
          lastReviewedAt: new Date('2026-04-01'),
        },
        property: null,
      },
      {
        createdAt: new Date('2026-04-22'),
        market: null,
        property: {
          id: 'cabcdefghij1234567890klmn',
          address: '1234 Ocean Way, Santa Monica, California 90405, United States',
          latitude: 34.0089,
          longitude: -118.4973,
          city: 'Santa Monica',
          stateCode: 'CA',
          countyName: 'Los Angeles',
          marketId: 'mkt-1',
          requirementsGeneratedAt: new Date('2026-04-22'),
          market: {
            slug: 'santa-monica',
            name: 'Santa Monica',
            strStatus: 'conditional',
            freshnessStatus: 'fresh',
            lastReviewedAt: new Date('2026-04-01'),
          },
        },
      },
    ])

    const res = await GET(makeRequest('GET'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.markets).toHaveLength(1)
    expect(body.markets[0].marketSlug).toBe('santa-monica')
    expect(body.properties).toHaveLength(1)
    expect(body.properties[0].propertyId).toBe('cabcdefghij1234567890klmn')
    expect(body.properties[0].property.market?.slug).toBe('santa-monica')
  })

  it('handles a property whose market is unsupported (null)', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    mockDb.watchlistItem.findMany.mockResolvedValueOnce([
      {
        createdAt: new Date('2026-04-22'),
        market: null,
        property: {
          id: 'cabcdefghij1234567890klmn',
          address: '500 Nowhere Rd, Unknown, NV 00000',
          latitude: 0,
          longitude: 0,
          city: null,
          stateCode: null,
          countyName: null,
          marketId: null,
          requirementsGeneratedAt: null,
          market: null,
        },
      },
    ])

    const res = await GET(makeRequest('GET'))
    const body = await res.json()
    expect(body.properties[0].property.market).toBeNull()
    expect(body.properties[0].property.requirementsGeneratedAt).toBeNull()
  })
})

// ---------------------------------------------------------------------------
// POST /api/watchlist — market branch
// ---------------------------------------------------------------------------
describe('POST /api/watchlist (market)', () => {
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

  it('returns 400 when neither marketSlug nor propertyAddress is present', async () => {
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

  it('returns 201 and upserts on valid market save', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    mockDb.market.findUnique.mockResolvedValueOnce({ id: 'mkt-1', supportStatus: 'supported' })
    mockDb.watchlistItem.upsert.mockResolvedValueOnce({})

    const res = await POST(makeRequest('POST', { marketSlug: 'santa-monica' }))
    expect(res.status).toBe(201)
    expect(mockDb.watchlistItem.upsert).toHaveBeenCalledOnce()
    expect(mockDb.watchlistItem.upsert.mock.calls[0][0].where).toEqual({
      userId_marketId: { userId: 'user-1', marketId: 'mkt-1' },
    })
  })
})

// ---------------------------------------------------------------------------
// POST /api/watchlist — property branch
// ---------------------------------------------------------------------------
describe('POST /api/watchlist (property)', () => {
  it('returns 404 when property does not exist', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    mockDb.property.findUnique.mockResolvedValueOnce(null)

    const res = await POST(makeRequest('POST', { propertyAddress: '999 Unknown St, Nowhere' }))
    expect(res.status).toBe(404)
  })

  it('returns 201 and upserts on valid property save', async () => {
    mockRequireSession.mockResolvedValueOnce(stubUser)
    mockDb.property.findUnique.mockResolvedValueOnce({ id: 'prop-1' })
    mockDb.watchlistItem.upsert.mockResolvedValueOnce({})

    const res = await POST(
      makeRequest('POST', {
        propertyAddress: '1234 Ocean Way, Santa Monica, California 90405, United States',
      })
    )
    expect(res.status).toBe(201)
    expect(mockDb.watchlistItem.upsert).toHaveBeenCalledOnce()
    expect(mockDb.watchlistItem.upsert.mock.calls[0][0].where).toEqual({
      userId_propertyId: { userId: 'user-1', propertyId: 'prop-1' },
    })
  })
})
