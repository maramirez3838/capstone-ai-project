/**
 * Tests for GET /api/property/requirements
 *
 * db.property is mocked — no database connection required.
 * runPropertyRequirementsAgent is mocked — no Anthropic API calls made.
 *
 * Test cases:
 *   Validation:   400 on missing address, marketId, lat, or lon
 *   Cache check:  404 when property not in cache (must run /api/search first)
 *   Happy path:   200 with disclaimerRequired: true and full result shape
 *   Agent errors: 503 for missing API key; 404 for bad marketId; 500 for other failures
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  db: {
    property: { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/agents/property-requirements-agent', () => ({
  runPropertyRequirementsAgent: vi.fn(),
}))

import { GET } from '@/app/api/property/requirements/route'
import { db } from '@/lib/db'
import { runPropertyRequirementsAgent } from '@/lib/agents/property-requirements-agent'

const mockDb = db as unknown as { property: { findUnique: ReturnType<typeof vi.fn> } }
const mockAgent = runPropertyRequirementsAgent as ReturnType<typeof vi.fn>

function makeRequest(params: Record<string, string>) {
  const url = new URL('http://localhost:3000/api/property/requirements')
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value)
  }
  return new NextRequest(url.toString())
}

const validParams = {
  address: '1234 Ocean Ave, Santa Monica, CA 90401, United States',
  marketId: 'mkt-santa-monica',
  lat: '34.0195',
  lon: '-118.4912',
}

const stubProperty = { id: 'prop-1', address: validParams.address, marketId: 'mkt-santa-monica' }

const stubAgentResult = {
  address: validParams.address,
  marketId: 'mkt-santa-monica',
  requirements: [
    {
      ruleKey: 'fire_inspection',
      label: 'Fire Safety Inspection',
      value: 'Required before first rental',
      details: 'Contact Santa Monica Fire Dept.',
      codeRef: '§ 8.04.090',
      codeUrl: 'https://ecode360.com/12345678',
      requirementLevel: 'required',
    },
  ],
  confidenceNote: 'Verify current requirements with the Santa Monica Fire Department.',
  reviewFlags: [],
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe('GET /api/property/requirements — input validation', () => {
  it('returns 400 when address is missing', async () => {
    const { address: _, ...rest } = validParams
    const res = await GET(makeRequest(rest))
    expect(res.status).toBe(400)
  })

  it('returns 400 when marketId is missing', async () => {
    const { marketId: _, ...rest } = validParams
    const res = await GET(makeRequest(rest))
    expect(res.status).toBe(400)
  })

  it('returns 400 when lat is not a number', async () => {
    const res = await GET(makeRequest({ ...validParams, lat: 'not-a-number' }))
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Property cache check
// ---------------------------------------------------------------------------

describe('GET /api/property/requirements — property cache check', () => {
  it('returns 404 when address is not in the Property cache', async () => {
    mockDb.property.findUnique.mockResolvedValueOnce(null)

    const res = await GET(makeRequest(validParams))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/not found in cache/i)
  })
})

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('GET /api/property/requirements — happy path', () => {
  it('returns 200 with disclaimerRequired: true', async () => {
    mockDb.property.findUnique.mockResolvedValueOnce(stubProperty)
    mockAgent.mockResolvedValueOnce(stubAgentResult)

    const res = await GET(makeRequest(validParams))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.disclaimerRequired).toBe(true)
  })

  it('returns requirements array from agent', async () => {
    mockDb.property.findUnique.mockResolvedValueOnce(stubProperty)
    mockAgent.mockResolvedValueOnce(stubAgentResult)

    const res = await GET(makeRequest(validParams))
    const body = await res.json()
    expect(body.requirements).toHaveLength(1)
    expect(body.requirements[0].ruleKey).toBe('fire_inspection')
    expect(body.requirements[0].requirementLevel).toBe('required')
  })

  it('returns confidenceNote and reviewFlags from agent', async () => {
    mockDb.property.findUnique.mockResolvedValueOnce(stubProperty)
    mockAgent.mockResolvedValueOnce(stubAgentResult)

    const res = await GET(makeRequest(validParams))
    const body = await res.json()
    expect(typeof body.confidenceNote).toBe('string')
    expect(Array.isArray(body.reviewFlags)).toBe(true)
  })

  it('calls agent with correct input derived from query params', async () => {
    mockDb.property.findUnique.mockResolvedValueOnce(stubProperty)
    mockAgent.mockResolvedValueOnce(stubAgentResult)

    await GET(makeRequest(validParams))

    expect(mockAgent).toHaveBeenCalledOnce()
    const [input] = mockAgent.mock.calls[0]
    expect(input.address).toBe(validParams.address)
    expect(input.marketId).toBe(validParams.marketId)
    expect(input.latitude).toBe(34.0195)
    expect(input.longitude).toBe(-118.4912)
  })
})

// ---------------------------------------------------------------------------
// Agent error handling
// ---------------------------------------------------------------------------

describe('GET /api/property/requirements — agent errors', () => {
  it('returns 503 when ANTHROPIC_API_KEY is not configured', async () => {
    mockDb.property.findUnique.mockResolvedValueOnce(stubProperty)
    mockAgent.mockRejectedValueOnce(new Error('ANTHROPIC_API_KEY is not configured'))

    const res = await GET(makeRequest(validParams))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toMatch(/unavailable/i)
  })

  it('returns 404 when agent reports market not found', async () => {
    mockDb.property.findUnique.mockResolvedValueOnce(stubProperty)
    mockAgent.mockRejectedValueOnce(new Error('Market not found: mkt-bad-id'))

    const res = await GET(makeRequest(validParams))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/market not found/i)
  })

  it('returns 500 for other agent failures', async () => {
    mockDb.property.findUnique.mockResolvedValueOnce(stubProperty)
    mockAgent.mockRejectedValueOnce(new Error('Unexpected Sonnet error'))

    const res = await GET(makeRequest(validParams))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/failed/i)
  })
})
