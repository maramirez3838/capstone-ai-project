// Sprint 4 — Market Refresh Agent
//
// Refreshes an existing market's STR rules using Claude Sonnet + web_search.
// Receives the current DB record as grounded context — agent only updates what
// web_search confirms has changed or can be improved, never hallucinates new data.
//
// Cost model: Haiku pre-screen (assess record gaps) → Sonnet + web_search full refresh.
// Called by: /api/admin/ingest-market (HMAC-protected, existing markets only).

import Anthropic from '@anthropic-ai/sdk'

export interface MarketIngestionInput {
  cityName: string
  stateCode: string
  countyName?: string
  // Current DB state — passed in by the route as agent context
  existingMarket?: ExistingMarketContext
}

// Shape of the existing DB record the route passes to the agent
export interface ExistingMarketContext {
  slug: string
  strStatus: string
  permitRequired: string
  ownerOccupancyRequired: string
  summary: string
  notableRestrictions?: string
  rules: Array<{
    ruleKey: string
    label: string
    value: string
    details?: string
    codeRef?: string
    codeUrl?: string
    applicableTo: string
    jurisdictionLevel?: string
  }>
  sources: Array<{
    title: string
    url: string
    sourceType: string
    publisher?: string
    sourceStatus: string
  }>
}

export interface IngestionCandidateRule {
  ruleKey: string          // machine key, e.g. "nightly_cap"
  label: string            // display label, e.g. "Nightly Cap"
  value: string            // display value, e.g. "90 nights/year"
  details?: string         // optional expanded explanation
  codeRef?: string         // e.g. "SMC § 6.20.050"
  codeUrl?: string         // section-anchored URL on approved platform
  applicableTo: 'str_full' | 'home_sharing' | 'both'
  jurisdictionLevel?: 'city' | 'county' | 'state'
}

export interface IngestionCandidateSource {
  title: string
  url: string
  sourceType: 'official_program_page' | 'municipal_code' | 'tax_registration' | 'city_ordinance' | 'other'
  publisher?: string
}

export interface MarketIngestionResult {
  cityName: string
  stateCode: string
  countyName: string
  slug: string
  strStatus: 'allowed' | 'conditional' | 'not_allowed'
  permitRequired: 'yes' | 'no' | 'varies'
  ownerOccupancyRequired: 'yes' | 'no' | 'varies'
  summary: string          // 120–180 word plain-English compliance summary
  notableRestrictions?: string
  rules: IngestionCandidateRule[]
  sources: IngestionCandidateSource[]
  confidenceScore: number  // 0–1, Haiku-assessed confidence
  reviewNotes: string[]    // flags requiring human verification before publishing
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildSlug(cityName: string): string {
  return cityName.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')
}

// ---------------------------------------------------------------------------
// Phase 1: Haiku pre-screen — assess gaps in the existing record before Sonnet
// ---------------------------------------------------------------------------

async function haikuPrescreen(
  anthropic: Anthropic,
  input: MarketIngestionInput
): Promise<{ available: boolean; confidence: number; notes: string[] }> {
  const location = [input.cityName, input.countyName, input.stateCode].filter(Boolean).join(', ')

  const existingContext = input.existingMarket
    ? `Current record summary:
- STR status: ${input.existingMarket.strStatus}
- Permit required: ${input.existingMarket.permitRequired}
- Owner occupancy: ${input.existingMarket.ownerOccupancyRequired}
- Rules: ${input.existingMarket.rules.length} (keys: ${input.existingMarket.rules.map((r) => r.ruleKey).join(', ')})
- Sources: ${input.existingMarket.sources.length}
- Rules missing codeUrl: ${input.existingMarket.rules.filter((r) => !r.codeUrl).length}`
    : 'No existing record — this would be a new market.'

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 256,
    messages: [
      {
        role: 'user',
        content: `Assess the quality and completeness of this STR compliance record for ${location}.

${existingContext}

Return a JSON object only — no prose, no markdown fences:
{
  "available": true,
  "confidence": 0.0 to 1.0,
  "notes": ["gaps or concerns the human reviewer should check"]
}

Set confidence based on: how complete the existing rules look, whether codeUrls are present, and whether the existing summary seems specific to this city vs. generic.`,
      },
    ],
  })

  // Loop all text blocks — Claude may emit prose before the JSON (lessons.md)
  try {
    for (const block of msg.content) {
      if (block.type !== 'text') continue
      const m = block.text.match(/\{[\s\S]*\}/)
      if (m) {
        const parsed = JSON.parse(m[0])
        return {
          available: Boolean(parsed.available),
          confidence: Number(parsed.confidence) || 0.5,
          notes: Array.isArray(parsed.notes) ? (parsed.notes as string[]) : [],
        }
      }
    }
  } catch { /* fall through */ }

  return {
    available: true,
    confidence: 0.5,
    notes: ['Haiku pre-screen parse failed — treat all refresh results as low confidence'],
  }
}

// ---------------------------------------------------------------------------
// Phase 2: Sonnet + web_search — full refresh grounded in existing market data
// ---------------------------------------------------------------------------

async function sonnetFullResearch(
  anthropic: Anthropic,
  input: MarketIngestionInput,
  prescreen: { confidence: number; notes: string[] }
): Promise<MarketIngestionResult> {
  const location = [input.cityName, input.countyName, input.stateCode].filter(Boolean).join(', ')
  const slug = input.existingMarket?.slug ?? buildSlug(input.cityName)

  const existingJson = input.existingMarket
    ? JSON.stringify(input.existingMarket, null, 2)
    : 'No existing record.'

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4096,
    system: [
      {
        type: 'text',
        // Cached: source quality rules are stable across all refresh runs — reduces cost
        cache_control: { type: 'ephemeral' },
        text: `You are an STR compliance research agent that refreshes existing market records.

Your job is NOT to invent data — it is to verify and improve an existing record using live web searches.

Source quality rules (must follow exactly):
- Only cite official government sources: .gov domains, city/county websites, or approved municipal code platforms
- Approved municipal code platforms: ecode360.com, amlegal.com, municode.com, library.municode.com
- All codeUrl fields MUST be section-anchored (not jurisdiction homepages):
    • ecode360.com: numeric GUID path e.g. /42735096 (NOT top-level like /SA5008)
    • amlegal.com: ends in /0-0-0-{node-id} for the specific section
    • municode.com: uses ?nodeId={HIERARCHY_ID} anchored to the section
- Never link to third-party aggregators, news articles, or real estate sites

Output rules:
- Return a single JSON object — no prose, no markdown fences
- summary must be 120–180 words of plain English, specific to this city
- Preserve existing data that web_search confirms is still accurate
- Only change a field when web_search gives you better or more current information
- Add a reviewNotes entry for EVERY field you changed and why
- Flag uncertainty — do not suppress it`,
      },
    ],
    tools: [
      {
        type: 'web_search_20260209' as const,
        name: 'web_search',
        max_uses: 5,
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Refresh the STR compliance record for ${location}.

EXISTING RECORD (your baseline — preserve what is still accurate):
${existingJson}

Use web_search to verify and improve the existing record. Return the complete updated record as a single JSON object:
{
  "cityName": "${input.cityName}",
  "stateCode": "${input.stateCode}",
  "countyName": "${input.countyName ?? input.existingMarket?.slug?.replace(/-/g, ' ') ?? ''}",
  "slug": "${slug}",
  "strStatus": "allowed" | "conditional" | "not_allowed",
  "permitRequired": "yes" | "no" | "varies",
  "ownerOccupancyRequired": "yes" | "no" | "varies",
  "summary": "120–180 word plain-English compliance summary specific to this city",
  "notableRestrictions": "short highlights for the card, or null",
  "rules": [
    {
      "ruleKey": "snake_case_key",
      "label": "Display Label",
      "value": "Display Value",
      "details": "expanded explanation or null",
      "codeRef": "e.g. SMMC § 6.20.050 or null",
      "codeUrl": "section-anchored URL or null",
      "applicableTo": "str_full" | "home_sharing" | "both",
      "jurisdictionLevel": "city" | "county" | "state"
    }
  ],
  "sources": [
    {
      "title": "Page title",
      "url": "https://...",
      "sourceType": "official_program_page" | "municipal_code" | "tax_registration" | "city_ordinance" | "other",
      "publisher": "City of ..."
    }
  ],
  "confidenceScore": ${prescreen.confidence},
  "reviewNotes": ${JSON.stringify(prescreen.notes)}
}

Priority: fix any missing codeUrls, verify rule values are current, and improve the summary if it is generic.
Always include str_status, permit_required, and owner_occupancy rules at minimum.`,
      },
    ],
  })

  // Claude may emit intermediate text blocks before the final JSON — loop all (lessons.md)
  try {
    let jsonMatch: RegExpMatchArray | null = null
    for (const block of msg.content) {
      if (block.type !== 'text') continue
      const m = block.text.match(/\{[\s\S]*\}/)
      if (m) {
        jsonMatch = m
        break
      }
    }
    if (!jsonMatch) {
      throw new Error('No JSON object found in Sonnet response')
    }

    const raw = JSON.parse(jsonMatch[0]) as Record<string, unknown>

    return {
      cityName: (raw.cityName as string) ?? input.cityName,
      stateCode: (raw.stateCode as string) ?? input.stateCode,
      countyName: (raw.countyName as string) ?? input.countyName ?? '',
      slug: (raw.slug as string) ?? slug,
      strStatus: (raw.strStatus as MarketIngestionResult['strStatus']) ?? 'conditional',
      permitRequired: (raw.permitRequired as MarketIngestionResult['permitRequired']) ?? 'varies',
      ownerOccupancyRequired:
        (raw.ownerOccupancyRequired as MarketIngestionResult['ownerOccupancyRequired']) ?? 'varies',
      summary: (raw.summary as string) ?? '',
      notableRestrictions:
        (raw.notableRestrictions as string | null | undefined) ?? undefined,
      rules: Array.isArray(raw.rules) ? (raw.rules as IngestionCandidateRule[]) : [],
      sources: Array.isArray(raw.sources) ? (raw.sources as IngestionCandidateSource[]) : [],
      confidenceScore:
        typeof raw.confidenceScore === 'number' ? raw.confidenceScore : prescreen.confidence,
      reviewNotes: Array.isArray(raw.reviewNotes)
        ? (raw.reviewNotes as string[])
        : prescreen.notes,
    }
  } catch (err) {
    throw new Error(`Market refresh agent failed to parse Sonnet response: ${err}`)
  }
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function runMarketIngestionAgent(
  input: MarketIngestionInput
): Promise<MarketIngestionResult> {
  const anthropic = new Anthropic()

  const location = [input.cityName, input.countyName, input.stateCode].filter(Boolean).join(', ')

  // Phase 1: Haiku pre-screen — assess record quality before the expensive Sonnet call
  console.log(`[market-refresh] Pre-screening ${location}`)
  const prescreen = await haikuPrescreen(anthropic, input)
  console.log(
    `[market-refresh] Haiku: confidence=${prescreen.confidence}, notes=${prescreen.notes.length}`
  )

  // Phase 2: Sonnet + web_search — full refresh grounded in existing market data
  console.log(`[market-refresh] Running Sonnet refresh for ${location}`)
  const result = await sonnetFullResearch(anthropic, input, prescreen)
  console.log(
    `[market-refresh] Complete: ${result.rules.length} rules, ${result.sources.length} sources`
  )

  return result
}
