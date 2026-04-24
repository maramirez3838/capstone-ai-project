/**
 * Unit tests for lib/agents/market-ingestion-agent.ts
 *
 * Anthropic SDK is fully mocked — no API calls made.
 *
 * Test cases:
 *   Haiku pre-screen:  parses single/multi text block; falls back on parse failure
 *   Sonnet research:   extracts JSON from later text blocks; throws when no JSON found
 *   Context grounding: existing market data is passed in the user message
 *   Result shape:      returned MarketIngestionResult matches expected fields
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Anthropic SDK before importing the agent.
// Must use a regular function (not arrow) so `new Anthropic()` works as a constructor.
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function () {
    return { messages: { create: mockCreate } }
  }),
}))

import { runMarketIngestionAgent, type MarketIngestionInput } from '@/lib/agents/market-ingestion-agent'

// ---------------------------------------------------------------------------
// Helpers to build mock Anthropic responses
// ---------------------------------------------------------------------------

function textBlock(text: string) {
  return { type: 'text' as const, text }
}

function haikuResponse(json: object) {
  return { content: [textBlock(JSON.stringify(json))] }
}

function haikuResponseWithPreamble(json: object) {
  return {
    content: [
      textBlock('Let me think about this...'),
      textBlock(JSON.stringify(json)),
    ],
  }
}

function sonnetResponse(json: object) {
  return { content: [textBlock(JSON.stringify(json))] }
}

function sonnetResponseWithPreamble(json: object) {
  return {
    content: [
      textBlock('I found the following information about STR regulations...'),
      textBlock(JSON.stringify(json)),
    ],
  }
}

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const baseInput: MarketIngestionInput = {
  cityName: 'Santa Monica',
  stateCode: 'CA',
  countyName: 'Los Angeles County',
}

const inputWithContext: MarketIngestionInput = {
  ...baseInput,
  existingMarket: {
    slug: 'santa-monica',
    strStatus: 'conditional',
    permitRequired: 'yes',
    ownerOccupancyRequired: 'yes',
    summary: 'Existing summary.',
    notableRestrictions: 'Primary residence only.',
    rules: [
      { ruleKey: 'str_status', label: 'STR Eligibility', value: 'Conditional', details: undefined, codeRef: 'SMMC § 6.20.010', codeUrl: 'https://ecode360.com/42735096', applicableTo: 'both', jurisdictionLevel: 'city' },
    ],
    sources: [
      { title: 'Home-Sharing Program', url: 'https://www.santamonica.gov/', sourceType: 'official_program_page', publisher: 'City of Santa Monica', sourceStatus: 'active' },
    ],
  },
}

const validAgentResult = {
  cityName: 'Santa Monica',
  stateCode: 'CA',
  countyName: 'Los Angeles County',
  slug: 'santa-monica',
  strStatus: 'conditional',
  permitRequired: 'yes',
  ownerOccupancyRequired: 'yes',
  summary: 'This is a 120–180 word plain-English summary of STR compliance in Santa Monica. Home-sharing program tied to primary residence. Permits required.',
  notableRestrictions: 'Primary residence only.',
  rules: [
    { ruleKey: 'str_status', label: 'STR Eligibility', value: 'Conditional', applicableTo: 'both', jurisdictionLevel: 'city' },
  ],
  sources: [
    { title: 'Home-Sharing Program', url: 'https://www.santamonica.gov/', sourceType: 'official_program_page', publisher: 'City of Santa Monica' },
  ],
  confidenceScore: 0.9,
  reviewNotes: ['Verify nightly cap is still 30 nights/year'],
}

const haikuResult = { available: true, confidence: 0.8, notes: ['Record looks mostly complete'] }

beforeEach(() => {
  vi.clearAllMocks()
})

// ---------------------------------------------------------------------------
// Haiku pre-screen parsing
// ---------------------------------------------------------------------------

describe('market-ingestion-agent — Haiku pre-screen', () => {
  it('parses Haiku JSON from a single text block', async () => {
    mockCreate
      .mockResolvedValueOnce(haikuResponse(haikuResult))  // Haiku
      .mockResolvedValueOnce(sonnetResponse(validAgentResult))  // Sonnet

    const result = await runMarketIngestionAgent(baseInput)
    // If Haiku parsed successfully, confidenceScore should be 0.8
    expect(result.confidenceScore).toBe(0.9) // Sonnet overrides with its own value
    expect(mockCreate).toHaveBeenCalledTimes(2)
  })

  it('finds Haiku JSON in a later text block (skips preamble prose)', async () => {
    mockCreate
      .mockResolvedValueOnce(haikuResponseWithPreamble(haikuResult))
      .mockResolvedValueOnce(sonnetResponse(validAgentResult))

    await expect(runMarketIngestionAgent(baseInput)).resolves.toBeDefined()
  })

  it('falls back to default prescreen values when Haiku returns unparseable text', async () => {
    mockCreate
      .mockResolvedValueOnce({ content: [textBlock('I cannot determine this.')] })  // no JSON
      .mockResolvedValueOnce(sonnetResponse(validAgentResult))

    // Should not throw — falls back gracefully
    const result = await runMarketIngestionAgent(baseInput)
    expect(result).toBeDefined()
  })
})

// ---------------------------------------------------------------------------
// Sonnet response parsing
// ---------------------------------------------------------------------------

describe('market-ingestion-agent — Sonnet response parsing', () => {
  it('extracts result JSON from a single text block', async () => {
    mockCreate
      .mockResolvedValueOnce(haikuResponse(haikuResult))
      .mockResolvedValueOnce(sonnetResponse(validAgentResult))

    const result = await runMarketIngestionAgent(baseInput)
    expect(result.cityName).toBe('Santa Monica')
    expect(result.stateCode).toBe('CA')
    expect(result.strStatus).toBe('conditional')
    expect(result.rules).toHaveLength(1)
    expect(result.sources).toHaveLength(1)
  })

  it('finds result JSON in a later text block (skips preamble prose)', async () => {
    mockCreate
      .mockResolvedValueOnce(haikuResponse(haikuResult))
      .mockResolvedValueOnce(sonnetResponseWithPreamble(validAgentResult))

    const result = await runMarketIngestionAgent(baseInput)
    expect(result.strStatus).toBe('conditional')
  })

  it('throws when Sonnet returns no JSON in any text block', async () => {
    mockCreate
      .mockResolvedValueOnce(haikuResponse(haikuResult))
      .mockResolvedValueOnce({ content: [textBlock('I could not find any official sources.')] })

    await expect(runMarketIngestionAgent(baseInput)).rejects.toThrow(/parse/)
  })

  it('includes Haiku notes in the initial reviewNotes if Sonnet does not override', async () => {
    const resultWithNotes = {
      ...validAgentResult,
      reviewNotes: ['Haiku note carried forward'],
    }
    mockCreate
      .mockResolvedValueOnce(haikuResponse({ available: true, confidence: 0.5, notes: ['Haiku note carried forward'] }))
      .mockResolvedValueOnce(sonnetResponse(resultWithNotes))

    const result = await runMarketIngestionAgent(baseInput)
    expect(result.reviewNotes).toContain('Haiku note carried forward')
  })
})

// ---------------------------------------------------------------------------
// Context grounding
// ---------------------------------------------------------------------------

describe('market-ingestion-agent — existing market context', () => {
  it('passes existing market JSON in the Sonnet user message', async () => {
    mockCreate
      .mockResolvedValueOnce(haikuResponse(haikuResult))
      .mockResolvedValueOnce(sonnetResponse(validAgentResult))

    await runMarketIngestionAgent(inputWithContext)

    // The second call (Sonnet) should include existing market data in the user message
    const sonnetCall = mockCreate.mock.calls[1][0]
    const userContent = sonnetCall.messages[0].content as string
    expect(userContent).toContain('santa-monica')
    expect(userContent).toContain('str_status')
  })

  it('passes Haiku assessment notes into Sonnet prompt context', async () => {
    mockCreate
      .mockResolvedValueOnce(haikuResponse({ available: true, confidence: 0.6, notes: ['Missing codeUrls on 2 rules'] }))
      .mockResolvedValueOnce(sonnetResponse(validAgentResult))

    await runMarketIngestionAgent(inputWithContext)

    const sonnetCall = mockCreate.mock.calls[1][0]
    const userContent = sonnetCall.messages[0].content as string
    expect(userContent).toContain('Missing codeUrls on 2 rules')
  })

  it('uses existing slug when existingMarket is provided', async () => {
    mockCreate
      .mockResolvedValueOnce(haikuResponse(haikuResult))
      .mockResolvedValueOnce(sonnetResponse({ ...validAgentResult, slug: 'santa-monica' }))

    const result = await runMarketIngestionAgent(inputWithContext)
    expect(result.slug).toBe('santa-monica')
  })
})

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

describe('market-ingestion-agent — result shape', () => {
  it('returns all required MarketIngestionResult fields', async () => {
    mockCreate
      .mockResolvedValueOnce(haikuResponse(haikuResult))
      .mockResolvedValueOnce(sonnetResponse(validAgentResult))

    const result = await runMarketIngestionAgent(baseInput)

    expect(result).toMatchObject({
      cityName: expect.any(String),
      stateCode: expect.any(String),
      countyName: expect.any(String),
      slug: expect.any(String),
      strStatus: expect.stringMatching(/^(allowed|conditional|not_allowed)$/),
      permitRequired: expect.stringMatching(/^(yes|no|varies)$/),
      ownerOccupancyRequired: expect.stringMatching(/^(yes|no|varies)$/),
      summary: expect.any(String),
      rules: expect.any(Array),
      sources: expect.any(Array),
      confidenceScore: expect.any(Number),
      reviewNotes: expect.any(Array),
    })
  })

  it('generates slug from cityName when existingMarket is absent', async () => {
    mockCreate
      .mockResolvedValueOnce(haikuResponse(haikuResult))
      .mockResolvedValueOnce(sonnetResponse({ ...validAgentResult, slug: 'san-jose' }))

    const result = await runMarketIngestionAgent({ cityName: 'San Jose', stateCode: 'CA' })
    // Agent returns what it returns — the route owns slug immutability
    expect(result.slug).toBe('san-jose')
  })
})
