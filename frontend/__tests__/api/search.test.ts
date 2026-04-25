/**
 * Tests for GET /api/search
 *
 * db is fully mocked — no database connection required.
 * To add coverage: import { GET } from '@/app/api/search/route' and add cases below.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the db singleton before importing the route handler
vi.mock('@/lib/db', () => ({
  db: {
    market: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
    marketAlias: {
      findFirst: vi.fn(),
    },
    property: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}))

// Mock geocoding so the address path can be tested without hitting Mapbox
vi.mock('@/lib/geocoding', async () => {
  const actual = await vi.importActual<typeof import('@/lib/geocoding')>('@/lib/geocoding')
  return {
    ...actual,
    geocodeAddress: vi.fn(),
  }
})

import { GET } from '@/app/api/search/route'
import { db } from '@/lib/db'
import { geocodeAddress, GeocodingError } from '@/lib/geocoding'

const mockDb = db as unknown as {
  market: { findUnique: ReturnType<typeof vi.fn>; findFirst: ReturnType<typeof vi.fn> }
  marketAlias: { findFirst: ReturnType<typeof vi.fn> }
  property: { findUnique: ReturnType<typeof vi.fn>; create: ReturnType<typeof vi.fn> }
}
const mockGeocode = geocodeAddress as unknown as ReturnType<typeof vi.fn>

function makeRequest(query: string) {
  return new NextRequest(`http://localhost:3000/api/search?q=${encodeURIComponent(query)}`)
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('GET /api/search — input validation', () => {
  it('returns 400 when q is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/search')
    const res = await GET(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toBeTruthy()
  })

  it('returns 400 when q exceeds 200 characters', async () => {
    const req = makeRequest('a'.repeat(201))
    const res = await GET(req)
    expect(res.status).toBe(400)
  })
})

describe('GET /api/search — market resolution', () => {
  const stubMarket = { id: '1', slug: 'santa-monica', name: 'Santa Monica', strStatus: 'conditional' }

  it('returns supported result on exact slug match', async () => {
    mockDb.market.findUnique.mockResolvedValueOnce(stubMarket)

    const res = await GET(makeRequest('santa-monica'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('supported')
    expect(body.resolution).toBe('market')
    expect(body.property).toBeUndefined()
    expect(body.market.slug).toBe('santa-monica')
    expect(body.redirectUrl).toBe('/market/santa-monica')
  })

  it('returns supported result via alias when slug misses', async () => {
    mockDb.market.findUnique.mockResolvedValueOnce(null)
    mockDb.marketAlias.findFirst.mockResolvedValueOnce({
      alias: 'sm',
      market: { ...stubMarket, supportStatus: 'supported' },
    })

    const res = await GET(makeRequest('sm'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('supported')
  })

  it('returns supported result via partial name when slug and alias miss', async () => {
    mockDb.market.findUnique.mockResolvedValueOnce(null)
    mockDb.marketAlias.findFirst.mockResolvedValueOnce(null)
    mockDb.market.findFirst.mockResolvedValueOnce(stubMarket)

    const res = await GET(makeRequest('santa'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('supported')
  })

  it('returns unsupported when no match found', async () => {
    mockDb.market.findUnique.mockResolvedValueOnce(null)
    mockDb.marketAlias.findFirst.mockResolvedValueOnce(null)
    mockDb.market.findFirst.mockResolvedValueOnce(null)

    const res = await GET(makeRequest('nowhere'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('unsupported')
    expect(body.normalizedQuery).toBe('nowhere')
  })

  it('does not follow alias to an archived market', async () => {
    mockDb.market.findUnique.mockResolvedValueOnce(null)
    mockDb.marketAlias.findFirst.mockResolvedValueOnce({
      alias: 'old-sm',
      market: { ...stubMarket, supportStatus: 'archived' },
    })
    mockDb.market.findFirst.mockResolvedValueOnce(null)

    const res = await GET(makeRequest('old-sm'))
    const body = await res.json()
    expect(body.type).toBe('unsupported')
  })

  it('returns 500 on database error', async () => {
    mockDb.market.findUnique.mockRejectedValueOnce(new Error('DB down'))

    const res = await GET(makeRequest('santa-monica'))
    expect(res.status).toBe(500)
  })
})

describe('GET /api/search — address resolution', () => {
  const stubMarket = {
    id: 'm1',
    slug: 'santa-monica',
    name: 'Santa Monica',
    strStatus: 'conditional',
    supportStatus: 'supported',
  }
  const stubGeocoded = {
    normalizedAddress: '1234 Ocean Ave, Santa Monica, California 90401, United States',
    latitude: 34.0,
    longitude: -118.5,
    city: 'Santa Monica',
    stateCode: 'CA',
    countyName: 'Los Angeles County',
    postalCode: '90401',
  }

  it('attaches property and resolution=address on cache hit (supported market)', async () => {
    mockGeocode.mockResolvedValueOnce(stubGeocoded)
    mockDb.property.findUnique.mockResolvedValueOnce({
      latitude: stubGeocoded.latitude,
      longitude: stubGeocoded.longitude,
      city: stubGeocoded.city,
      countyName: stubGeocoded.countyName,
      marketId: 'm1',
      market: stubMarket,
    })

    const res = await GET(makeRequest('1234 Ocean Ave'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.type).toBe('supported')
    expect(body.resolution).toBe('address')
    expect(body.market.slug).toBe('santa-monica')
    expect(body.property).toEqual({
      address: stubGeocoded.normalizedAddress,
      latitude: stubGeocoded.latitude,
      longitude: stubGeocoded.longitude,
      city: stubGeocoded.city,
      countyName: stubGeocoded.countyName,
    })
    expect(body.redirectUrl).toBe('/market/santa-monica')
  })

  it('attaches property and resolution=address on cache miss (alias-resolved market)', async () => {
    mockGeocode.mockResolvedValueOnce(stubGeocoded)
    mockDb.property.findUnique.mockResolvedValueOnce(null)
    mockDb.marketAlias.findFirst.mockResolvedValueOnce({
      alias: 'santa monica',
      market: stubMarket,
    })
    mockDb.property.create.mockResolvedValueOnce({})

    const res = await GET(makeRequest('1234 Ocean Ave'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.resolution).toBe('address')
    expect(body.property?.address).toBe(stubGeocoded.normalizedAddress)
    expect(mockDb.property.create).toHaveBeenCalledOnce()
  })

  it('returns unsupported (no resolution stamp) when geocoded city has no market', async () => {
    mockGeocode.mockResolvedValueOnce({ ...stubGeocoded, city: 'Nowhere' })
    mockDb.property.findUnique.mockResolvedValueOnce(null)
    mockDb.marketAlias.findFirst.mockResolvedValueOnce(null)
    mockDb.market.findFirst.mockResolvedValueOnce(null)
    mockDb.property.create.mockResolvedValueOnce({})

    const res = await GET(makeRequest('999 Made Up Way'))
    const body = await res.json()
    expect(body.type).toBe('unsupported')
    expect(body.normalizedQuery).toBe('Nowhere')
  })

  it('falls back to market-name path on GeocodingError (token absent)', async () => {
    mockGeocode.mockRejectedValueOnce(new GeocodingError('NEXT_PUBLIC_MAPBOX_TOKEN is not configured'))
    mockDb.market.findUnique.mockResolvedValueOnce(null)
    mockDb.marketAlias.findFirst.mockResolvedValueOnce(null)
    mockDb.market.findFirst.mockResolvedValueOnce(null)

    const res = await GET(makeRequest('1234 Ocean Ave'))
    const body = await res.json()
    // Geocoding failed silently; market-name path took over and returned unsupported
    expect(body.type).toBe('unsupported')
  })
})
