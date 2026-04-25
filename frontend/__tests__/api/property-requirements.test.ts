/**
 * Tests for GET /api/property/requirements
 *
 * db.property + db.market are mocked — no database connection required.
 * runPropertyRequirementsAgent is mocked — no Anthropic API calls made.
 *
 * Test cases:
 *   Validation:   400 on missing address, marketId, lat, or lon
 *   Cache check:  404 when property not in cache (must run /api/search first)
 *   Cache layer:  HIT returns persisted output without calling the agent;
 *                 MISS or stale rulesVersion runs the agent and persists
 *   Happy path:   200 with disclaimerRequired: true and full result shape
 *   Agent errors: 503 for missing API key; 404 for bad marketId; 500 for other
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

vi.mock('@/lib/db', () => ({
  db: {
    property: { findUnique: vi.fn(), update: vi.fn() },
    market:   { findUnique: vi.fn() },
  },
}))

vi.mock('@/lib/agents/property-requirements-agent', () => ({
  runPropertyRequirementsAgent: vi.fn(),
}))

import { GET } from '@/app/api/property/requirements/route'
import { db } from '@/lib/db'
import { runPropertyRequirementsAgent } from '@/lib/agents/property-requirements-agent'

const mockDb = db as unknown as {
  property: {
    findUnique: ReturnType<typeof vi.fn>
    update: ReturnType<typeof vi.fn>
  }
  market: { findUnique: ReturnType<typeof vi.fn> }
}
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

// Empty-cache property — no requirements stored yet
const stubProperty = {
  id: 'prop-1',
  address: validParams.address,
  marketId: 'mkt-santa-monica',
  requirementsJson: null,
  requirementsConfidenceNote: null,
  requirementsReviewFlags: [],
  requirementsGeneratedAt: null,
  requirementsRulesVersion: null,
}

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
  // Default market — has a rulesVersion. Individual tests override as needed.
  mockDb.market.findUnique.mockResolvedValue({ rulesVersion: 'abc123' })
  mockDb.property.update.mockResolvedValue({})
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
// Requirements cache (the new cache layer)
// ---------------------------------------------------------------------------

describe('GET /api/property/requirements — cache layer', () => {
  it('returns cached requirements without calling the agent when rulesVersion matches', async () => {
    mockDb.property.findUnique.mockResolvedValueOnce({
      ...stubProperty,
      requirementsJson: stubAgentResult.requirements,
      requirementsConfidenceNote: stubAgentResult.confidenceNote,
      requirementsReviewFlags: stubAgentResult.reviewFlags,
      requirementsGeneratedAt: new Date('2026-04-25T12:00:00Z'),
      requirementsRulesVersion: 'abc123',
    })
    mockDb.market.findUnique.mockResolvedValueOnce({ rulesVersion: 'abc123' })

    const res = await GET(makeRequest(validParams))
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(mockAgent).not.toHaveBeenCalled()
    expect(mockDb.property.update).not.toHaveBeenCalled()
    expect(body.cached).toBe(true)
    expect(body.rulesVersion).toBe('abc123')
    expect(body.requirements).toHaveLength(1)
    expect(body.disclaimerRequired).toBe(true)
  })

  it('runs the agent and persists when rulesVersion is stale', async () => {
    mockDb.property.findUnique.mockResolvedValueOnce({
      ...stubProperty,
      requirementsJson: [{ ruleKey: 'old_rule' }],
      requirementsConfidenceNote: 'old note',
      requirementsReviewFlags: ['old_flag'],
      requirementsGeneratedAt: new Date('2026-04-01T00:00:00Z'),
      requirementsRulesVersion: 'OLD_VERSION',
    })
    mockDb.market.findUnique.mockResolvedValueOnce({ rulesVersion: 'NEW_VERSION' })
    mockAgent.mockResolvedValueOnce(stubAgentResult)

    const res = await GET(makeRequest(validParams))
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(mockAgent).toHaveBeenCalledOnce()
    expect(mockDb.property.update).toHaveBeenCalledOnce()
    const updateArgs = mockDb.property.update.mock.calls[0][0]
    expect(updateArgs.data.requirementsRulesVersion).toBe('NEW_VERSION')
    expect(body.cached).toBe(false)
    expect(body.rulesVersion).toBe('NEW_VERSION')
  })

  it('runs the agent on first lookup (cache miss — null requirementsJson)', async () => {
    mockDb.property.findUnique.mockResolvedValueOnce(stubProperty)
    mockAgent.mockResolvedValueOnce(stubAgentResult)

    const res = await GET(makeRequest(validParams))
    expect(res.status).toBe(200)
    const body = await res.json()

    expect(mockAgent).toHaveBeenCalledOnce()
    expect(mockDb.property.update).toHaveBeenCalledOnce()
    expect(body.cached).toBe(false)
  })

  it('treats null market.rulesVersion as cache miss (do not serve stale)', async () => {
    mockDb.property.findUnique.mockResolvedValueOnce({
      ...stubProperty,
      requirementsJson: stubAgentResult.requirements,
      requirementsRulesVersion: null,
    })
    mockDb.market.findUnique.mockResolvedValueOnce({ rulesVersion: null })
    mockAgent.mockResolvedValueOnce(stubAgentResult)

    const res = await GET(makeRequest(validParams))
    expect(res.status).toBe(200)
    expect(mockAgent).toHaveBeenCalledOnce()
  })
})

// ---------------------------------------------------------------------------
// Happy path (cache miss → agent run)
// ---------------------------------------------------------------------------

describe('GET /api/property/requirements — happy path (cache miss)', () => {
  beforeEach(() => {
    mockDb.property.findUnique.mockResolvedValue(stubProperty)
    mockAgent.mockResolvedValue(stubAgentResult)
  })

  it('returns 200 with disclaimerRequired: true', async () => {
    const res = await GET(makeRequest(validParams))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.disclaimerRequired).toBe(true)
  })

  it('returns requirements array from agent', async () => {
    const res = await GET(makeRequest(validParams))
    const body = await res.json()
    expect(body.requirements).toHaveLength(1)
    expect(body.requirements[0].ruleKey).toBe('fire_inspection')
    expect(body.requirements[0].requirementLevel).toBe('required')
  })

  it('returns confidenceNote and reviewFlags from agent', async () => {
    const res = await GET(makeRequest(validParams))
    const body = await res.json()
    expect(typeof body.confidenceNote).toBe('string')
    expect(Array.isArray(body.reviewFlags)).toBe(true)
  })

  it('calls agent with correct input derived from query params', async () => {
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
// Agent error handling (cache miss path only — cache hits never call agent)
// ---------------------------------------------------------------------------

describe('GET /api/property/requirements — agent errors', () => {
  beforeEach(() => {
    mockDb.property.findUnique.mockResolvedValue(stubProperty)
  })

  it('returns 503 when ANTHROPIC_API_KEY is not configured', async () => {
    mockAgent.mockRejectedValueOnce(new Error('ANTHROPIC_API_KEY is not configured'))

    const res = await GET(makeRequest(validParams))
    expect(res.status).toBe(503)
    const body = await res.json()
    expect(body.error).toMatch(/unavailable/i)
  })

  it('returns 404 when agent reports market not found', async () => {
    mockAgent.mockRejectedValueOnce(new Error('Market not found: mkt-bad-id'))

    const res = await GET(makeRequest(validParams))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/market not found/i)
  })

  it('returns 500 for other agent failures', async () => {
    mockAgent.mockRejectedValueOnce(new Error('Unexpected Sonnet error'))

    const res = await GET(makeRequest(validParams))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/failed/i)
  })

  it('does not persist when the agent throws', async () => {
    mockAgent.mockRejectedValueOnce(new Error('Boom'))

    await GET(makeRequest(validParams))
    expect(mockDb.property.update).not.toHaveBeenCalled()
  })
})
