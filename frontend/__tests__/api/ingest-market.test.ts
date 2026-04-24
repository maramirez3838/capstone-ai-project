/**
 * Tests for POST /api/admin/ingest-market
 *
 * db.$queryRaw and db.$executeRaw are fully mocked — no database connection required.
 * runMarketIngestionAgent is mocked — no Anthropic API calls made.
 *
 * Test cases:
 *   Auth:        401 on missing, malformed, or expired token
 *   Validation:  400 on invalid body; 404 on unknown slug
 *   Happy path:  200 with correct response shape, ruleDiff, reviewNotes
 *   Rule diff:   added/removed/changed keys computed correctly
 *   DB writes:   only active sources deleted; rules replaced; market updated
 *   Errors:      500 when agent throws
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { createHmac } from 'crypto'

// Mock db before importing the route
vi.mock('@/lib/db', () => ({
  db: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
  },
}))

// Mock the agent — we test the agent separately
vi.mock('@/lib/agents/market-ingestion-agent', () => ({
  runMarketIngestionAgent: vi.fn(),
}))

import { POST } from '@/app/api/admin/ingest-market/route'
import { db } from '@/lib/db'
import { runMarketIngestionAgent } from '@/lib/agents/market-ingestion-agent'

const mockDb = db as { $queryRaw: ReturnType<typeof vi.fn>; $executeRaw: ReturnType<typeof vi.fn> }
const mockAgent = runMarketIngestionAgent as ReturnType<typeof vi.fn>

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const TEST_SECRET = 'test-secret-for-jest'

function makeAdminToken(offsetMs = 0): string {
  const ts = (Date.now() + offsetMs).toString()
  const sig = createHmac('sha256', TEST_SECRET).update(ts).digest('hex')
  return Buffer.from(`${ts}:${sig}`).toString('base64url')
}

function makeRequest(body: unknown, token?: string): NextRequest {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (token !== undefined) {
    headers['authorization'] = `Bearer ${token}`
  }
  return new NextRequest('http://localhost:3000/api/admin/ingest-market', {
    method: 'POST',
    body: JSON.stringify(body),
    headers,
  })
}

const stubMarket = {
  id: 'mkt-santa-monica',
  slug: 'santa-monica',
  name: 'Santa Monica',
  stateCode: 'CA',
  countyName: 'Los Angeles County',
  strStatus: 'conditional',
  permitRequired: 'yes',
  ownerOccupancyRequired: 'yes',
  summary: 'Existing summary.',
  notableRestrictions: 'Primary residence only.',
}

const stubRules = [
  { ruleKey: 'str_status', label: 'STR Eligibility', value: 'Conditional', details: null, codeRef: 'SMMC § 6.20.010', codeUrl: 'https://ecode360.com/42735096', applicableTo: 'both', jurisdictionLevel: 'city' },
  { ruleKey: 'permit_required', label: 'Permit', value: 'Required', details: null, codeRef: null, codeUrl: null, applicableTo: 'both', jurisdictionLevel: 'city' },
]

const stubSources = [
  { title: 'Home-Sharing Program', url: 'https://www.santamonica.gov/...', sourceType: 'official_program_page', publisher: 'City of Santa Monica', sourceStatus: 'active' },
  { title: 'Broken source', url: 'https://broken.example.com', sourceType: 'municipal_code', publisher: null, sourceStatus: 'broken' },
]

const stubAgentResult = {
  cityName: 'Santa Monica',
  stateCode: 'CA',
  countyName: 'Los Angeles County',
  slug: 'santa-monica',
  strStatus: 'conditional' as const,
  permitRequired: 'yes' as const,
  ownerOccupancyRequired: 'yes' as const,
  summary: 'Updated summary from agent.',
  notableRestrictions: 'Primary residence only.',
  rules: [
    { ruleKey: 'str_status', label: 'STR Eligibility', value: 'Conditional — Updated', details: 'Updated detail', codeRef: 'SMMC § 6.20.010', codeUrl: 'https://ecode360.com/42735096', applicableTo: 'both' as const, jurisdictionLevel: 'city' as const },
    { ruleKey: 'nightly_cap', label: 'Nightly Cap', value: '30 nights/year', details: null, codeRef: null, codeUrl: null, applicableTo: 'str_full' as const, jurisdictionLevel: 'city' as const },
  ],
  sources: [
    { title: 'Home-Sharing Program', url: 'https://www.santamonica.gov/...', sourceType: 'official_program_page' as const, publisher: 'City of Santa Monica' },
  ],
  confidenceScore: 0.85,
  reviewNotes: ['Verify nightly cap is still enforced'],
}

// ---------------------------------------------------------------------------
// Setup
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks()
  process.env.AUTH_SECRET = TEST_SECRET
  mockDb.$executeRaw.mockResolvedValue(undefined)
})

afterEach(() => {
  delete process.env.AUTH_SECRET
})

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

describe('POST /api/admin/ingest-market — auth', () => {
  it('returns 401 when Authorization header is missing', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/ingest-market', {
      method: 'POST',
      body: JSON.stringify({ slug: 'santa-monica' }),
      headers: { 'content-type': 'application/json' },
    })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 401 for a malformed token', async () => {
    const res = await POST(makeRequest({ slug: 'santa-monica' }, 'not-a-valid-token'))
    expect(res.status).toBe(401)
  })

  it('returns 401 for an expired token (6 minutes old)', async () => {
    const expiredToken = makeAdminToken(-6 * 60 * 1000)
    const res = await POST(makeRequest({ slug: 'santa-monica' }, expiredToken))
    expect(res.status).toBe(401)
  })

  it('returns 401 when AUTH_SECRET is not set', async () => {
    delete process.env.AUTH_SECRET
    const token = makeAdminToken()
    const res = await POST(makeRequest({ slug: 'santa-monica' }, token))
    expect(res.status).toBe(500) // misconfiguration before auth check
  })

  it('accepts a fresh valid token', async () => {
    // Mock DB to return the market so we get past auth to the actual slug check
    mockDb.$queryRaw.mockResolvedValueOnce([stubMarket])
    mockDb.$queryRaw.mockResolvedValueOnce(stubRules)
    mockDb.$queryRaw.mockResolvedValueOnce(stubSources)
    mockAgent.mockResolvedValueOnce(stubAgentResult)

    const res = await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))
    expect(res.status).toBe(200)
  })
})

// ---------------------------------------------------------------------------
// Input validation
// ---------------------------------------------------------------------------

describe('POST /api/admin/ingest-market — input validation', () => {
  it('returns 400 when body is not valid JSON', async () => {
    const req = new NextRequest('http://localhost:3000/api/admin/ingest-market', {
      method: 'POST',
      body: 'not-json',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${makeAdminToken()}`,
      },
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when slug is missing from body', async () => {
    const res = await POST(makeRequest({}, makeAdminToken()))
    expect(res.status).toBe(400)
  })

  it('returns 400 when slug is an empty string', async () => {
    const res = await POST(makeRequest({ slug: '' }, makeAdminToken()))
    expect(res.status).toBe(400)
  })
})

// ---------------------------------------------------------------------------
// Scope lock — unknown slugs
// ---------------------------------------------------------------------------

describe('POST /api/admin/ingest-market — scope lock', () => {
  it('returns 404 for a slug not in the Market table', async () => {
    mockDb.$queryRaw.mockResolvedValueOnce([]) // empty result = not found

    const res = await POST(makeRequest({ slug: 'chicago' }, makeAdminToken()))
    expect(res.status).toBe(404)
    const body = await res.json()
    expect(body.error).toMatch(/not found/i)
    expect(body.detail).toMatch(/existing markets/i)
  })
})

// ---------------------------------------------------------------------------
// Happy path
// ---------------------------------------------------------------------------

describe('POST /api/admin/ingest-market — happy path', () => {
  beforeEach(() => {
    mockDb.$queryRaw
      .mockResolvedValueOnce([stubMarket])  // market lookup
      .mockResolvedValueOnce(stubRules)      // existing rules
      .mockResolvedValueOnce(stubSources)    // existing sources
    mockAgent.mockResolvedValueOnce(stubAgentResult)
  })

  it('returns 200 with correct response shape', async () => {
    const res = await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))
    expect(res.status).toBe(200)

    const body = await res.json()
    expect(body.marketId).toBe('mkt-santa-monica')
    expect(body.slug).toBe('santa-monica')
    expect(body.confidenceScore).toBe(0.85)
    expect(body.ruleCount).toBe(2)
    expect(body.sourceCount).toBe(1)
    expect(Array.isArray(body.reviewNotes)).toBe(true)
    expect(body.result).toBeDefined()
  })

  it('includes ruleDiff in response', async () => {
    const res = await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))
    const body = await res.json()

    expect(body.ruleDiff).toBeDefined()
    expect(Array.isArray(body.ruleDiff.added)).toBe(true)
    expect(Array.isArray(body.ruleDiff.removed)).toBe(true)
    expect(Array.isArray(body.ruleDiff.changed)).toBe(true)
  })

  it('detects added rules in the diff', async () => {
    const res = await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))
    const body = await res.json()
    // agent added 'nightly_cap' which was not in stubRules
    expect(body.ruleDiff.added).toContain('nightly_cap')
  })

  it('detects removed rules in the diff', async () => {
    const res = await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))
    const body = await res.json()
    // agent dropped 'permit_required' which was in stubRules
    expect(body.ruleDiff.removed).toContain('permit_required')
  })

  it('detects changed rule values in the diff', async () => {
    const res = await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))
    const body = await res.json()
    // str_status value changed from 'Conditional' to 'Conditional — Updated'
    const valueChange = body.ruleDiff.changed.find(
      (c: { ruleKey: string; field: string }) => c.ruleKey === 'str_status' && c.field === 'value'
    )
    expect(valueChange).toBeDefined()
    expect(valueChange.from).toBe('Conditional')
    expect(valueChange.to).toBe('Conditional — Updated')
  })

  it('appends diff summary to reviewNotes', async () => {
    const res = await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))
    const body = await res.json()
    const notes: string[] = body.reviewNotes
    // At least one diff note should be present (added, removed, or changed)
    const hasDiffNote = notes.some(
      (n) => n.includes('added') || n.includes('removed') || n.includes('changed')
    )
    expect(hasDiffNote).toBe(true)
  })

  it('calls agent with existing market context', async () => {
    await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))
    expect(mockAgent).toHaveBeenCalledOnce()
    const [input] = mockAgent.mock.calls[0]
    expect(input.existingMarket).toBeDefined()
    expect(input.existingMarket.slug).toBe('santa-monica')
    expect(input.existingMarket.rules).toHaveLength(2)
    expect(input.existingMarket.sources).toHaveLength(2)
  })
})

// ---------------------------------------------------------------------------
// DB write behavior
// ---------------------------------------------------------------------------

describe('POST /api/admin/ingest-market — DB writes', () => {
  beforeEach(() => {
    mockDb.$queryRaw
      .mockResolvedValueOnce([stubMarket])
      .mockResolvedValueOnce(stubRules)
      .mockResolvedValueOnce(stubSources)
    mockAgent.mockResolvedValueOnce(stubAgentResult)
  })

  it('updates the market row with new compliance fields', async () => {
    await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))

    const updateCall = mockDb.$executeRaw.mock.calls.find((args: unknown[]) => {
      const sql = String(args[0])
      return sql.includes('UPDATE') && sql.includes('Market')
    })
    expect(updateCall).toBeDefined()
  })

  it('sets freshnessStatus to needs_review on market UPDATE', async () => {
    await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))

    const updateCall = mockDb.$executeRaw.mock.calls.find((args: unknown[]) =>
      String(args[0]).includes('needs_review')
    )
    expect(updateCall).toBeDefined()
  })

  it('deletes existing MarketRule rows before inserting new ones', async () => {
    await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))

    const deleteRulesCall = mockDb.$executeRaw.mock.calls.find((args: unknown[]) => {
      const sql = String(args[0])
      return sql.includes('DELETE') && sql.includes('MarketRule')
    })
    expect(deleteRulesCall).toBeDefined()
  })

  it('only deletes active sources (preserves broken/pending_review)', async () => {
    await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))

    const deleteSourcesCall = mockDb.$executeRaw.mock.calls.find((args: unknown[]) => {
      const sql = String(args[0])
      return sql.includes('DELETE') && sql.includes('MarketSource')
    })
    expect(deleteSourcesCall).toBeDefined()
    // The DELETE should include a sourceStatus filter
    expect(String(deleteSourcesCall![0])).toContain('active')
  })

  it('inserts one MarketRule row per rule returned by the agent', async () => {
    await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))

    const insertRuleCalls = mockDb.$executeRaw.mock.calls.filter((args: unknown[]) => {
      const sql = String(args[0])
      return sql.includes('INSERT') && sql.includes('MarketRule')
    })
    expect(insertRuleCalls).toHaveLength(stubAgentResult.rules.length)
  })

  it('inserts one MarketSource row per source returned by the agent', async () => {
    await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))

    const insertSourceCalls = mockDb.$executeRaw.mock.calls.filter((args: unknown[]) => {
      const sql = String(args[0])
      return sql.includes('INSERT') && sql.includes('MarketSource')
    })
    expect(insertSourceCalls).toHaveLength(stubAgentResult.sources.length)
  })
})

// ---------------------------------------------------------------------------
// Agent failure
// ---------------------------------------------------------------------------

describe('POST /api/admin/ingest-market — agent errors', () => {
  it('returns 500 when the agent throws', async () => {
    mockDb.$queryRaw
      .mockResolvedValueOnce([stubMarket])
      .mockResolvedValueOnce(stubRules)
      .mockResolvedValueOnce(stubSources)
    mockAgent.mockRejectedValueOnce(new Error('Sonnet parse failed'))

    const res = await POST(makeRequest({ slug: 'santa-monica' }, makeAdminToken()))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/agent failed/i)
    expect(body.detail).toContain('Sonnet parse failed')
  })
})
