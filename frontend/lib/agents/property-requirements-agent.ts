// Property Requirements Agent — Sprint 3
//
// Generates property-level compliance requirements for a specific address within a
// supported market. Covers requirements that vary by property characteristics rather
// than market-wide rules: fire code, parking, signage, tax registration, inspections.
//
// Called by: /api/property/requirements after a property is geocoded and resolved
// to a supported market via /api/search.
//
// Uses Claude Sonnet + tool_use for structured output (avoids JSON parsing fragility).
// Prompt caches market rules context — stable across calls for the same market.

import Anthropic from '@anthropic-ai/sdk'
import { db } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface PropertyRequirementsInput {
  address: string          // full normalized address (Mapbox place_name)
  marketId: string         // resolved market ID from the Property cache
  latitude: number
  longitude: number
}

export interface PropertyRequirement {
  ruleKey: string          // e.g. "fire_inspection", "parking", "signage", "tot_registration"
  label: string            // display label
  value: string            // display value
  details?: string         // optional expanded explanation
  codeRef?: string         // citation reference, e.g. "§ 8.04.090"
  codeUrl?: string         // section-anchored link (must follow 15A.9 patterns)
  requirementLevel: 'required' | 'conditional' | 'informational'
}

export interface PropertyRequirementsResult {
  address: string
  marketId: string
  requirements: PropertyRequirement[]
  // Plain-English note about confidence level and what to verify
  confidenceNote: string
  // Requirements the agent flagged as needing human verification
  reviewFlags: string[]
}

// ---------------------------------------------------------------------------
// Tool definition for structured output
// ---------------------------------------------------------------------------

const submitPropertyRequirementsTool: Anthropic.Tool = {
  name: 'submit_property_requirements',
  description:
    'Submit the property-level STR compliance requirements found for this address. ' +
    'Only include requirements that go beyond the market-level rules already provided as context.',
  input_schema: {
    type: 'object',
    properties: {
      requirements: {
        type: 'array',
        description: 'List of property-level compliance requirements.',
        items: {
          type: 'object',
          properties: {
            ruleKey: {
              type: 'string',
              description: 'Snake_case identifier, e.g. fire_inspection, parking_requirement, signage, tot_registration.',
            },
            label: { type: 'string', description: 'Short display label, e.g. "Fire Safety Inspection".' },
            value: { type: 'string', description: 'Concise answer, e.g. "Required before first rental".' },
            details: {
              type: 'string',
              description: 'Optional expanded explanation (1–3 sentences).',
            },
            codeRef: {
              type: 'string',
              description: 'Municipal code section reference, e.g. "§ 8.04.090". Omit if no regulatory basis.',
            },
            codeUrl: {
              type: 'string',
              description:
                'Section-anchored URL on ecode360, amlegal, or municode. ' +
                'ecode360: numeric GUID path. amlegal: /0-0-0-{id}. municode: ?nodeId={id}. Omit if unknown.',
            },
            requirementLevel: {
              type: 'string',
              enum: ['required', 'conditional', 'informational'],
              description: 'required = always applies; conditional = depends on property characteristics; informational = FYI / uncertain.',
            },
          },
          required: ['ruleKey', 'label', 'value', 'requirementLevel'],
        },
      },
      confidenceNote: {
        type: 'string',
        description:
          'Plain-English summary of how confident you are in these requirements and what the user should independently verify (1–2 sentences).',
      },
      reviewFlags: {
        type: 'array',
        items: { type: 'string' },
        description: 'List of requirement labels or rule keys where the agent is uncertain and recommends human verification.',
      },
    },
    required: ['requirements', 'confidenceNote', 'reviewFlags'],
  },
}

// ---------------------------------------------------------------------------
// Agent
// ---------------------------------------------------------------------------

export async function runPropertyRequirementsAgent(
  input: PropertyRequirementsInput
): Promise<PropertyRequirementsResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  // Fetch market + rules from DB to use as grounding context
  const market = await db.market.findUnique({
    where: { id: input.marketId },
    include: { rules: true },
  })
  if (!market) {
    throw new Error(`Market not found: ${input.marketId}`)
  }

  const anthropic = new Anthropic({ apiKey })

  const marketRulesJson = JSON.stringify(
    market.rules.map((r) => ({
      ruleKey: r.ruleKey,
      label: r.label,
      value: r.value,
      applicableTo: r.applicableTo,
      jurisdictionLevel: r.jurisdictionLevel,
    })),
    null,
    2
  )

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    tools: [submitPropertyRequirementsTool],
    tool_choice: { type: 'any' },
    system: [
      {
        type: 'text',
        // Market rules are stable context — cache them to reduce cost on repeated calls
        cache_control: { type: 'ephemeral' },
        text: `You are an STR (short-term rental) compliance researcher specializing in US municipal law.

You are reviewing a property in ${market.name}, ${market.stateCode} for STR compliance requirements.

The following are the EXISTING market-level rules already shown to users in the product's RuleCards:
${marketRulesJson}

Your job is to identify PROPERTY-LEVEL requirements that go beyond these market-wide rules. Focus on requirements that depend on the specific property or property type:
- Fire code: inspection requirements, smoke/CO detector specs, egress requirements
- Parking: off-street parking minimums, guest parking rules, permit zones
- Signage: exterior signage requirements, posting obligations (permit number display)
- TOT / tax registration: Transient Occupancy Tax registration process, deadlines, reporting
- Business license: city or county business license requirements distinct from STR permit
- Inspections: any required pre-rental inspections beyond standard fire code

Rules:
1. DO NOT repeat requirements already covered by the existing market rules above.
2. For every requirement that has a regulatory basis, include codeRef and codeUrl.
3. codeUrl must be section-anchored (not a homepage): ecode360 uses numeric GUIDs, amlegal uses /0-0-0-{id}, municode uses ?nodeId={id}.
4. When uncertain about a requirement, set requirementLevel to "informational" and add the ruleKey to reviewFlags.
5. If a requirement only applies under certain conditions (e.g. property has a pool, or is a condo vs. house), set requirementLevel to "conditional" and explain in details.
6. Output a confidenceNote summarizing what users should independently verify with the city.`,
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Property address: ${input.address}
Coordinates: ${input.latitude}, ${input.longitude}
Market: ${market.name}, ${market.stateCode}

Identify all property-level STR compliance requirements for this address that are not already covered by the market-level rules provided.`,
      },
    ],
  })

  // Extract the tool_use block — loop all content blocks (Claude may emit text before tool call)
  type ToolInput = {
    requirements: PropertyRequirement[]
    confidenceNote: string
    reviewFlags: string[]
  }
  let toolInput: ToolInput | null = null

  for (const block of response.content) {
    if (block.type === 'tool_use' && block.name === 'submit_property_requirements') {
      toolInput = block.input as ToolInput
      break
    }
  }

  if (!toolInput) {
    throw new Error('Agent did not return structured requirements')
  }

  return {
    address: input.address,
    marketId: input.marketId,
    requirements: toolInput.requirements,
    confidenceNote: toolInput.confidenceNote,
    reviewFlags: toolInput.reviewFlags,
  }
}
