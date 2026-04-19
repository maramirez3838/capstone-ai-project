// Source Discoverer Agent — finds replacement URLs for broken MarketSource records.
//
// Called automatically by the compliance monitor after it detects broken sources.
// Uses Claude Sonnet 4.6 with the built-in web_search tool to find official
// government replacement URLs, then Haiku to validate relevance before storing.
//
// Cost: ~$0.03–$0.09 per broken source (web_search capped at 3 uses per call).

import Anthropic from '@anthropic-ai/sdk'
import { randomUUID } from 'crypto'
import { db } from '@/lib/db'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BrokenSourceInput {
  sourceId: string
  url: string
}

interface BrokenSourceRecord {
  id: string
  url: string
  sourceType: string
  publisher: string | null
  displayOrder: number
  discoveryAttempts: number
  marketId: string
  marketName: string
}

interface RawCandidate {
  title: string
  url: string
  publisher: string
}

export interface DiscoveryCandidate {
  pendingSourceId: string
  brokenSourceId: string
  brokenUrl: string
  marketName: string
  title: string
  url: string
  publisher: string
  sourceType: string
}

export interface ExhaustedSource {
  marketName: string
  brokenUrl: string
  attempts: number
}

export interface DiscoveryResult {
  candidates: DiscoveryCandidate[]
  exhausted: ExhaustedSource[]
}

// ---------------------------------------------------------------------------
// AI: Sonnet + web_search to find replacement URL candidates
// ---------------------------------------------------------------------------

async function searchForReplacement(
  anthropic: Anthropic,
  source: BrokenSourceRecord
): Promise<RawCandidate[]> {
  const sourceTypeLabel: Record<string, string> = {
    official_program_page: 'official STR / home-sharing program page',
    municipal_code: 'municipal code section governing short-term rentals',
    tax_registration: 'short-term rental tax or business registration page',
    city_ordinance: 'city ordinance or resolution on short-term rentals',
    other: 'official government page related to short-term rental regulations',
  }

  const label = sourceTypeLabel[source.sourceType] ?? sourceTypeLabel.other

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 1024,
    // web_search_20260209 supports dynamic filtering, reducing token cost
    tools: [
      {
        type: 'web_search_20260209' as const,
        name: 'web_search',
        max_uses: 3, // hard cap: 3 searches = max $0.03 in search fees
      },
    ],
    messages: [
      {
        role: 'user',
        content: `The source URL for ${source.marketName} STR compliance is broken: ${source.url}

Find the current official replacement. I need the ${label} for ${source.marketName}.

Rules:
- Return ONLY official government sources (.gov, city, county, or known municipal domains)
- Prefer stable top-level program pages over deep PDF links
- No third-party aggregators, news articles, or real estate sites
- If you find 1–3 valid candidates, include all of them

Return a JSON array only — no prose, no markdown fences:
[
  {
    "title": "descriptive page title",
    "url": "https://...",
    "publisher": "City of ..."
  }
]

If no valid official source is found, return an empty array: []`,
      },
    ],
  })

  // Claude sometimes emits multiple text blocks (intermediate prose before the final JSON).
  // Search all text blocks for the JSON array rather than stopping at the first.
  try {
    let jsonMatch: RegExpMatchArray | null = null
    for (const block of msg.content) {
      if (block.type !== 'text') continue
      const m = block.text.match(/\[[\s\S]*\]/)
      if (m) { jsonMatch = m; break }
    }
    if (!jsonMatch) return []
    const parsed = JSON.parse(jsonMatch[0])
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (c): c is RawCandidate =>
        typeof c.title === 'string' && typeof c.url === 'string' && typeof c.publisher === 'string'
    )
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// AI: Haiku validates each candidate before storing (cheap gate)
// ---------------------------------------------------------------------------

async function isRelevantSource(
  anthropic: Anthropic,
  candidate: RawCandidate,
  marketName: string
): Promise<boolean> {
  // Quick syntactic check first — skip clearly wrong URLs
  try {
    const parsed = new URL(candidate.url)
    if (!['http:', 'https:'].includes(parsed.protocol)) return false
  } catch {
    return false
  }

  const msg = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 16,
    messages: [
      {
        role: 'user',
        content: `Does this URL likely contain official short-term rental regulations, permit requirements, or compliance rules for ${marketName}?

URL: ${candidate.url}
Title: ${candidate.title}
Publisher: ${candidate.publisher}

Reply with exactly one word: YES or NO`,
      },
    ],
  })

  const reply = (msg.content[0] as { text: string }).text.trim().toUpperCase()
  console.log(`[source-discoverer] Haiku verdict for ${candidate.url}: ${reply}`)
  return reply.startsWith('YES')
}

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export async function discoverReplacements(
  brokenSources: BrokenSourceInput[],
  anthropic: Anthropic
): Promise<DiscoveryResult> {
  const candidates: DiscoveryCandidate[] = []
  const exhausted: ExhaustedSource[] = []

  if (brokenSources.length === 0) return { candidates, exhausted }

  // Fetch full records for broken sources that haven't hit the attempt cap
  const sourceIds = brokenSources.map((s) => s.sourceId)
  const records = await db.$queryRaw<BrokenSourceRecord[]>`
    SELECT
      ms.id,
      ms.url,
      ms."sourceType",
      ms.publisher,
      ms."displayOrder",
      ms."discoveryAttempts",
      m.id AS "marketId",
      m.name AS "marketName"
    FROM "MarketSource" ms
    JOIN "Market" m ON m.id = ms."marketId"
    WHERE ms.id = ANY(${sourceIds}::text[])
      AND ms."discoveryAttempts" < 3
  `

  for (const source of records) {
    console.log(`[source-discoverer] Searching for replacement: ${source.url}`)

    // Run Sonnet + web_search
    const rawCandidates = await searchForReplacement(anthropic, source)

    // Haiku-validate each candidate
    const validated: RawCandidate[] = []
    for (const c of rawCandidates) {
      const relevant = await isRelevantSource(anthropic, c, source.marketName)
      if (relevant) validated.push(c)
    }

    // Increment attempt counter on the broken source regardless of outcome
    await db.$executeRaw`
      UPDATE "MarketSource"
      SET "discoveryAttempts" = "discoveryAttempts" + 1
      WHERE id = ${source.id}
    `

    if (validated.length === 0) {
      console.log(`[source-discoverer] No valid candidates found for ${source.url}`)
      // Will appear as exhausted if this was the 3rd attempt
      const newAttempts = source.discoveryAttempts + 1
      if (newAttempts >= 3) {
        exhausted.push({
          marketName: source.marketName,
          brokenUrl: source.url,
          attempts: newAttempts,
        })
      }
      continue
    }

    // Write validated candidates to DB as pending_review
    for (const c of validated) {
      const newId = randomUUID()
      await db.$executeRaw`
        INSERT INTO "MarketSource" (
          id, "marketId", title, url, "sourceType", publisher,
          "displayOrder", "sourceStatus", "replacesId", "createdAt"
        ) VALUES (
          ${newId},
          ${source.marketId},
          ${c.title},
          ${c.url},
          ${source.sourceType},
          ${c.publisher},
          ${source.displayOrder},
          'pending_review',
          ${source.id},
          NOW()
        )
      `

      candidates.push({
        pendingSourceId: newId,
        brokenSourceId: source.id,
        brokenUrl: source.url,
        marketName: source.marketName,
        title: c.title,
        url: c.url,
        publisher: c.publisher,
        sourceType: source.sourceType,
      })

      console.log(`[source-discoverer] Candidate stored for ${source.marketName}: ${c.url}`)
    }
  }

  return { candidates, exhausted }
}
