// On-demand source discovery CLI — use when adding a new market.
//
// Usage:
//   npx tsx scripts/discover-sources.ts --market "West Hollywood, CA"
//
// Output: scripts/discovery-output/<slug>.json
// Review the JSON, then copy the sources array into backend/data/markets.ts.

import { configDotenv } from 'dotenv'
import { resolve } from 'path'

configDotenv({ path: resolve(process.cwd(), '.env.local') })

import Anthropic from '@anthropic-ai/sdk'
import { writeFile, mkdir } from 'fs/promises'

// ---------------------------------------------------------------------------
// Parse CLI arg
// ---------------------------------------------------------------------------

const marketArg = process.argv[process.argv.indexOf('--market') + 1]
if (!marketArg) {
  console.error('Usage: npx tsx scripts/discover-sources.ts --market "City Name, ST"')
  process.exit(1)
}

const marketName = marketArg.trim()
const slug = marketName
  .toLowerCase()
  .replace(/[,]+/g, '')
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '')

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function fetchUrl(url: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10_000),
      headers: { 'User-Agent': 'STRComply-SourceBot/1.0' },
    })
    return { ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}` }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'fetch failed' }
  }
}

// ---------------------------------------------------------------------------
// Sonnet + web_search discovery
// ---------------------------------------------------------------------------

interface SourceCandidate {
  title: string
  url: string
  sourceType: 'official_program_page' | 'municipal_code' | 'tax_registration' | 'city_ordinance' | 'other'
  publisher: string
  displayOrder: number
  verified: boolean
  verifyError?: string
}

async function discoverSources(anthropic: Anthropic, market: string): Promise<SourceCandidate[]> {
  console.log(`[discover-sources] Searching for official STR sources: ${market}`)

  const msg = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    tools: [
      {
        type: 'web_search_20260209' as const,
        name: 'web_search',
        max_uses: 3,
      },
    ],
    messages: [
      {
        role: 'user',
        content: `Find all official government sources for short-term rental (STR) regulations in ${market}.

I need:
1. The official STR / home-sharing program page (city or county government site)
2. The municipal code section governing STRs (if separate)
3. The permit or license registration page (if separate from the program page)
4. Any key city ordinance PDFs that established or amended the STR rules

Rules:
- Return ONLY official government sources (.gov, city, county, or official municipal domains)
- ecode360.com is an approved municipal code publisher — include it when it hosts the city's official code
- Prefer ecode360.com over general city website links when it hosts the municipal code
- When citing a specific code section, find the direct section URL — not just the jurisdiction homepage:
    • ecode360.com: section URLs use a numeric GUID (e.g. ecode360.com/42735096), not the jurisdiction code like SA5008
    • amlegal.com: section URLs end in /0-0-0-{node-id} for the specific section
    • municode.com: section URLs use ?nodeId={HIERARCHY_ID} anchored to the specific section
- Always prefer a section-anchored URL over the top-level code homepage
- No third-party aggregators, news articles, real estate sites, or Airbnb/VRBO pages
- Prefer stable top-level program pages over deep PDF links for long-term reliability
- Assign displayOrder 1 (most important) through N (least important)

Return a JSON array only — no prose, no markdown fences:
[
  {
    "title": "descriptive title for the page",
    "url": "https://...",
    "sourceType": "official_program_page | municipal_code | tax_registration | city_ordinance | other",
    "publisher": "City of ...",
    "displayOrder": 1
  }
]

If no official sources are found, return: []`,
      },
    ],
  })

  // Claude sometimes emits multiple text blocks (intermediate "let me compile" prose
  // followed by the actual JSON). Search all text blocks for the JSON array rather
  // than stopping at the first.
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
      (c): c is Omit<SourceCandidate, 'verified'> =>
        typeof c.title === 'string' &&
        typeof c.url === 'string' &&
        typeof c.sourceType === 'string' &&
        typeof c.publisher === 'string'
    ).map((c) => ({ ...c, verified: false }))
  } catch {
    return []
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const raw = await discoverSources(anthropic, marketName)

  if (raw.length === 0) {
    console.log('[discover-sources] No candidates found.')
  }

  // Verify each URL by fetching it
  console.log(`[discover-sources] Verifying ${raw.length} candidate(s)...`)
  const candidates: SourceCandidate[] = []
  for (const c of raw) {
    const result = await fetchUrl(c.url)
    candidates.push({ ...c, verified: result.ok, verifyError: result.error })
    const status = result.ok ? '✓' : `✗ ${result.error}`
    console.log(`  [${status}] ${c.url}`)
  }

  // Write output file
  const outputDir = resolve(process.cwd(), 'scripts/discovery-output')
  await mkdir(outputDir, { recursive: true })

  const outputPath = resolve(outputDir, `${slug}.json`)
  await writeFile(
    outputPath,
    JSON.stringify(
      {
        market: marketName,
        generatedAt: new Date().toISOString(),
        instructions: 'Copy the sources array into backend/data/markets.ts for this market. Verify each URL in a browser before committing.',
        sources: candidates,
      },
      null,
      2
    ),
    'utf-8'
  )

  const verified = candidates.filter((c) => c.verified).length
  console.log(`\n[discover-sources] Done. ${verified}/${candidates.length} verified.`)
  console.log(`[discover-sources] Output → ${outputPath}`)
}

main().catch((err) => {
  console.error('[discover-sources] Fatal:', err)
  process.exit(1)
})
