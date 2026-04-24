/**
 * Unit tests for lib/agents/property-requirements-agent.ts
 *
 * Anthropic SDK and db are fully mocked — no API calls or DB connection.
 *
 * Test cases:
 *   Guards:       throws when ANTHROPIC_API_KEY missing; throws when market not found
 *   Tool use:     extracts result from tool_use block; skips text preamble blocks
 *   Errors:       throws when agent returns no tool_use block
 *   Result shape: returned PropertyRequirementsResult has all required fields
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock db before importing the agent
vi.mock('@/lib/db', () => ({
  db: {
    market: { findUnique: vi.fn() },
  },
}))

// Mock Anthropic SDK.
// Must use a regular function (not arrow) so `new Anthropic()` works as a constructor.
const mockCreate = vi.fn()
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn(function () {
    return { messages: { create: mockCreate } }
  }),
}))

import { runPropertyRequirementsAgent } from '@/lib/agents/property-requirements-agent'
import { db } from '@/lib/db'

const mockDb = db as unknown as { market: { findUnique: ReturnType<typeof vi.fn> } }

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const validInput = {
  address: '1234 Ocean Ave, Santa Monica, CA 90401, United States',
  marketId: 'mkt-santa-monica',
  latitude: 34.0195,
  longitude: -118.4912,
}

const stubMarket = {
  id: 'mkt-santa-monica',
  name: 'Santa Monica',
  stateCode: 'CA',
  rules: [
    { ruleKey: 'str_status', label: 'STR Eligibility', value: 'Conditional', applicableTo: 'both', jurisdictionLevel: 'city' },
    { ruleKey: 'permit_required', label: 'Permit', value: 'Required', applicableTo: 'both', jurisdictionLevel: 'city' },
  ],
}

const stubToolUseBlock = {
  type: 'tool_use' as const,
  id: 'toolu_01',
  name: 'submit_property_requirements',
  input: {
    requirements: [
      {
        ruleKey: 'fire_inspection',
        label: 'Fire Safety Inspection',
        value: 'Required before first rental',
        requirementLevel: 'required',
      },
    ],
    confidenceNote: 'Verify with the Santa Monica Fire Department.',
    reviewFlags: [],
  },
}

function anthropicResponse(blocks: object[]) {
  return { content: blocks }
}

beforeEach(() => {
  vi.clearAllMocks()
  process.env.ANTHROPIC_API_KEY = 'sk-test-key'
})

// ---------------------------------------------------------------------------
// Guards
// ---------------------------------------------------------------------------

describe('property-requirements-agent — guards', () => {
  it('throws when ANTHROPIC_API_KEY is not set', async () => {
    delete process.env.ANTHROPIC_API_KEY

    await expect(runPropertyRequirementsAgent(validInput)).rejects.toThrow(
      'ANTHROPIC_API_KEY is not configured'
    )
  })

  it('throws when market is not found in the database', async () => {
    mockDb.market.findUnique.mockResolvedValueOnce(null)

    await expect(runPropertyRequirementsAgent(validInput)).rejects.toThrow(
      'Market not found: mkt-santa-monica'
    )
  })
})

// ---------------------------------------------------------------------------
// Tool use block extraction
// ---------------------------------------------------------------------------

describe('property-requirements-agent — tool use extraction', () => {
  it('extracts result from a tool_use block', async () => {
    mockDb.market.findUnique.mockResolvedValueOnce(stubMarket)
    mockCreate.mockResolvedValueOnce(anthropicResponse([stubToolUseBlock]))

    const result = await runPropertyRequirementsAgent(validInput)
    expect(result.requirements).toHaveLength(1)
    expect(result.requirements[0].ruleKey).toBe('fire_inspection')
    expect(result.requirements[0].requirementLevel).toBe('required')
  })

  it('skips text preamble blocks and finds tool_use in a later block', async () => {
    mockDb.market.findUnique.mockResolvedValueOnce(stubMarket)
    mockCreate.mockResolvedValueOnce(
      anthropicResponse([
        { type: 'text', text: 'I found some requirements...' },
        stubToolUseBlock,
      ])
    )

    const result = await runPropertyRequirementsAgent(validInput)
    expect(result.requirements).toHaveLength(1)
  })

  it('throws when agent returns no tool_use block', async () => {
    mockDb.market.findUnique.mockResolvedValueOnce(stubMarket)
    mockCreate.mockResolvedValueOnce(
      anthropicResponse([{ type: 'text', text: 'I cannot determine requirements.' }])
    )

    await expect(runPropertyRequirementsAgent(validInput)).rejects.toThrow(
      'Agent did not return structured requirements'
    )
  })
})

// ---------------------------------------------------------------------------
// Result shape
// ---------------------------------------------------------------------------

describe('property-requirements-agent — result shape', () => {
  it('returns a PropertyRequirementsResult with all required fields', async () => {
    mockDb.market.findUnique.mockResolvedValueOnce(stubMarket)
    mockCreate.mockResolvedValueOnce(anthropicResponse([stubToolUseBlock]))

    const result = await runPropertyRequirementsAgent(validInput)

    expect(result).toMatchObject({
      address: validInput.address,
      marketId: validInput.marketId,
      requirements: expect.any(Array),
      confidenceNote: expect.any(String),
      reviewFlags: expect.any(Array),
    })
  })

  it('includes market rules as system prompt context in the API call', async () => {
    mockDb.market.findUnique.mockResolvedValueOnce(stubMarket)
    mockCreate.mockResolvedValueOnce(anthropicResponse([stubToolUseBlock]))

    await runPropertyRequirementsAgent(validInput)

    const callArgs = mockCreate.mock.calls[0][0]
    const systemContent = callArgs.system[0].text as string
    // Market rules should be injected into system prompt
    expect(systemContent).toContain('str_status')
    expect(systemContent).toContain('permit_required')
    expect(systemContent).toContain('Santa Monica')
  })

  it('uses tool_choice: any to force structured output', async () => {
    mockDb.market.findUnique.mockResolvedValueOnce(stubMarket)
    mockCreate.mockResolvedValueOnce(anthropicResponse([stubToolUseBlock]))

    await runPropertyRequirementsAgent(validInput)

    const callArgs = mockCreate.mock.calls[0][0]
    expect(callArgs.tool_choice).toMatchObject({ type: 'any' })
  })
})
