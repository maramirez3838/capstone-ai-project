/**
 * intake-market.ts
 *
 * Market intake assistant for STR Comply.
 * Fetches city STR pages and drafts a SeedMarket TypeScript object
 * ready to paste into backend/data/markets.ts.
 *
 * Usage:
 *   ANTHROPIC_API_KEY=sk-... npx tsx intake-market.ts "City Name" URL1 [URL2 URL3]
 *
 * Output:
 *   scripts/drafts/<slug>.ts  — paste-ready SeedMarket object
 *
 * Environment:
 *   ANTHROPIC_API_KEY — required
 *   (optional) place in a .env file in this directory
 */

import Anthropic from '@anthropic-ai/sdk'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import * as dotenv from 'dotenv'

// ESM-compatible __dirname (Node 20 does not expose import.meta.dirname)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Load .env from the scripts/ directory if present (never commit .env)
dotenv.config({ path: path.join(__dirname, '.env') })

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MessageParam = Anthropic.Messages.MessageParam
type ContentBlock = Anthropic.Messages.ContentBlock
type ToolUseBlock = Anthropic.Messages.ToolUseBlock

// ---------------------------------------------------------------------------
// System prompt — cached; contains full interface definitions + example
// ---------------------------------------------------------------------------

const SYSTEM_PROMPT = `
You are a short-term rental (STR) compliance researcher for STR Comply, a compliance
lookup tool used by real estate investors. Your job is to read official municipal
sources and produce a complete, accurate SeedMarket TypeScript object.

══════════════════════════════════════════════
TYPESCRIPT INTERFACES  (do not deviate from these)
══════════════════════════════════════════════

interface SeedRule {
  ruleKey: string          // snake_case, e.g. "str_status", "permit_required", "owner_occupancy", "nightly_cap"
  label: string            // Short human label, e.g. "STR Eligibility"
  value: string            // Concise answer, e.g. "Conditional" or "30 nights/year (unhosted)"
  details?: string         // 1–2 sentence explanation
  codeRef?: string         // Municipal code citation, e.g. "SMMC § 6.20.010"
  codeUrl?: string         // URL to the code section (use source URL if no direct link)
  displayOrder: number     // 1-based, most important first
  jurisdictionLevel?: 'city' | 'county' | 'state'
}

interface SeedSource {
  title: string            // Full title of the page or document
  url: string              // Exact URL
  sourceType: 'official_program_page' | 'municipal_code' | 'tax_registration' | 'city_ordinance' | 'other'
  publisher?: string       // City/agency name, e.g. "City of Santa Monica"
  displayOrder: number     // 1-based, most authoritative first
}

interface SeedMarket {
  slug: string             // kebab-case city name, e.g. "santa-monica"
  name: string             // Human name, e.g. "Santa Monica"
  stateCode: string        // 2-letter state, e.g. "CA"
  countyName?: string      // e.g. "Los Angeles County"
  regionLabel?: string     // e.g. "Westside LA"
  strStatus: 'allowed' | 'conditional' | 'not_allowed'
  permitRequired: 'yes' | 'no' | 'varies'
  ownerOccupancyRequired: 'yes' | 'no' | 'varies'
  freshnessStatus: 'fresh' | 'review_due' | 'needs_review'  // always use 'fresh' for new entries
  supportStatus: 'supported' | 'unsupported' | 'archived'   // always 'supported' for new entries
  summary: string          // 120–180 words. Plain English. No legalese. No unsupported certainty.
  notableRestrictions?: string  // 1–2 sentence callout of the biggest "gotcha"
  lastReviewedAt: string   // ISO 8601, today's date at midnight UTC
  aliases: string[]        // Common spellings/abbreviations, all lowercase
  rules: SeedRule[]        // 4–8 rules covering the key investor decision points
  sources: SeedSource[]    // All sources you fetched
}

══════════════════════════════════════════════
ENUM CONSTRAINTS — ONLY THESE VALUES ARE VALID
══════════════════════════════════════════════

strStatus:              'allowed' | 'conditional' | 'not_allowed'
permitRequired:         'yes' | 'no' | 'varies'
ownerOccupancyRequired: 'yes' | 'no' | 'varies'
freshnessStatus:        'fresh' | 'review_due' | 'needs_review'
supportStatus:          'supported' | 'unsupported' | 'archived'
sourceType:             'official_program_page' | 'municipal_code' | 'tax_registration' | 'city_ordinance' | 'other'
jurisdictionLevel:      'city' | 'county' | 'state'

══════════════════════════════════════════════
SUMMARY RULES
══════════════════════════════════════════════

- 120–180 words. Count carefully.
- Plain English. No legalese.
- Cover: what type of STR is allowed, permit/registration process, owner-occupancy rule,
  notable caps or restrictions, and enforcement posture.
- Do NOT make legal determinations. Do NOT say "you cannot" — say "the ordinance requires".
- No hedging phrases like "it appears" unless you genuinely cannot confirm from the source.

══════════════════════════════════════════════
REVIEW NOTES  (append as comments where uncertain)
══════════════════════════════════════════════

If a field value is ambiguous or the source did not clearly answer it, append
  // TODO: verify — <reason>
immediately after the field value in the output object. This flags it for human review
before the entry is committed to the database.

══════════════════════════════════════════════
REFERENCE EXAMPLE — Santa Monica (complete)
══════════════════════════════════════════════

{
  slug: 'santa-monica',
  name: 'Santa Monica',
  stateCode: 'CA',
  countyName: 'Los Angeles County',
  regionLabel: 'Westside LA',
  strStatus: 'conditional',
  permitRequired: 'yes',
  ownerOccupancyRequired: 'yes',
  freshnessStatus: 'fresh',
  supportStatus: 'supported',
  summary:
    'Home-Sharing Program tied to primary residency only. Unhosted rentals capped at 30 nights/year; hosted stays uncapped. City registration required. Transient Occupancy Tax enforced. Hosts must display their registration number on all listings. Failure to register or exceed the nightly cap can result in fines and permit revocation. The program is actively enforced through platform data-sharing agreements with major STR platforms.',
  notableRestrictions:
    'Primary residence requirement strictly enforced. 30-night annual cap for unhosted stays.',
  lastReviewedAt: '2026-03-15T00:00:00.000Z',
  aliases: ['santa monica', 'sm', 'smc', 'santa monica ca'],
  rules: [
    {
      ruleKey: 'str_status',
      label: 'STR Eligibility',
      value: 'Conditional',
      details: 'Allowed under Home-Sharing Program for primary residences only.',
      displayOrder: 1,
      codeRef: 'SMMC § 6.20.010',
      codeUrl: 'https://www.smgov.net/Departments/CityClerk/MunicipalCode.aspx',
      jurisdictionLevel: 'city',
    },
    {
      ruleKey: 'permit_required',
      label: 'Permit / Registration',
      value: 'Required',
      details: 'City registration and business license required before listing. Annual renewal.',
      displayOrder: 2,
      codeRef: 'SMMC § 6.20.030',
      jurisdictionLevel: 'city',
    },
    {
      ruleKey: 'owner_occupancy',
      label: 'Owner Occupancy',
      value: 'Required',
      details: 'Primary residence requirement — must be your main home.',
      displayOrder: 3,
      codeRef: 'SMMC § 6.20.020',
      jurisdictionLevel: 'city',
    },
    {
      ruleKey: 'nightly_cap',
      label: 'Nightly Cap',
      value: '30 nights/year (unhosted)',
      details: 'Unhosted stays limited to 30 nights/year total. Hosted stays (host present) are uncapped.',
      displayOrder: 4,
      codeRef: 'SMMC § 6.20.050',
      jurisdictionLevel: 'city',
    },
  ],
  sources: [
    {
      title: 'Home-Sharing Program — City of Santa Monica',
      url: 'https://www.santamonica.gov/services/home-sharing',
      sourceType: 'official_program_page',
      publisher: 'City of Santa Monica',
      displayOrder: 1,
    },
    {
      title: 'Santa Monica Municipal Code § 6.20',
      url: 'https://www.smgov.net/Departments/CityClerk/MunicipalCode.aspx',
      sourceType: 'municipal_code',
      publisher: 'City of Santa Monica',
      displayOrder: 2,
    },
  ],
}

══════════════════════════════════════════════
OUTPUT FORMAT
══════════════════════════════════════════════

Respond with a SINGLE TypeScript object literal only.
- No imports
- No export keyword
- No surrounding prose or explanation
- No markdown code fences
- Start with { and end with }
- Use the exact field order shown in the reference example
`.trim()

// ---------------------------------------------------------------------------
// Utility: slugify a city name
// ---------------------------------------------------------------------------

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
}

// ---------------------------------------------------------------------------
// Utility: fetch a URL and return readable text (strip HTML tags)
// ---------------------------------------------------------------------------

async function fetchUrlText(url: string): Promise<string> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 15_000)

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'STRComply-IntakeBot/1.0 (compliance research tool)',
        Accept: 'text/html,application/xhtml+xml,text/plain',
      },
    })

    if (!res.ok) {
      return `[fetch failed: HTTP ${res.status} for ${url}]`
    }

    const raw = await res.text()

    // Strip script/style blocks first, then all remaining HTML tags
    const clean = raw
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/\s{3,}/g, '\n\n')
      .trim()

    // Cap at ~25 000 chars to stay well within context limits for large pages
    return clean.length > 25_000
      ? clean.slice(0, 25_000) + '\n\n[content truncated at 25 000 chars]'
      : clean
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return `[fetch failed: ${msg} for ${url}]`
  } finally {
    clearTimeout(timeout)
  }
}

// ---------------------------------------------------------------------------
// Agentic loop — manual so we can log fetch progress
// ---------------------------------------------------------------------------

async function runIntake(cityName: string, sourceUrls: string[]): Promise<string> {
  const client = new Anthropic()

  // The fetch_url tool definition — matches what we execute below
  const tools: Anthropic.Messages.Tool[] = [
    {
      name: 'fetch_url',
      description:
        'Fetches the text content of a URL. Use this to read city STR program pages and municipal code sections before drafting the SeedMarket object.',
      input_schema: {
        type: 'object' as const,
        properties: {
          url: {
            type: 'string',
            description: 'The full URL to fetch.',
          },
        },
        required: ['url'],
      },
    },
  ]

  // Initial user message — give Claude the city and URLs to start with
  const urlList = sourceUrls.map((u, i) => `${i + 1}. ${u}`).join('\n')
  const userMessage = `
Research the STR compliance rules for: ${cityName}

Start by fetching each of these source URLs using the fetch_url tool:
${urlList}

After reading the sources, produce the complete SeedMarket object for ${cityName}.
Today's date for lastReviewedAt: ${new Date().toISOString().split('T')[0]}T00:00:00.000Z
`.trim()

  const messages: MessageParam[] = [{ role: 'user', content: userMessage }]

  console.log(`\n▶ Starting intake for: ${cityName}`)
  console.log(`  Sources: ${sourceUrls.length} URL(s) provided\n`)

  // Agentic loop
  while (true) {
    // Stream the request — adaptive thinking needs streaming
    const stream = await client.messages.stream({
      model: 'claude-opus-4-6',
      max_tokens: 8000,
      // 'adaptive' is newer than the installed SDK type definitions which
      // only know 'enabled' | 'disabled'. Cast to bypass until types catch up.
      thinking: { type: 'adaptive' } as unknown as Anthropic.Messages.ThinkingConfigParam,
      system: [
        {
          type: 'text',
          text: SYSTEM_PROMPT,
          // Cache the large system prompt — same prompt across all market runs
          cache_control: { type: 'ephemeral' },
        },
      ],
      tools,
      messages,
    })

    const response = await stream.finalMessage()

    // Log cache stats on first turn (tells us if caching is working)
    if (messages.length === 1 && response.usage) {
      const u = response.usage as Anthropic.Messages.Usage & {
        cache_creation_input_tokens?: number
        cache_read_input_tokens?: number
      }
      if (u.cache_creation_input_tokens !== undefined) {
        console.log(
          `  [cache] created=${u.cache_creation_input_tokens} read=${u.cache_read_input_tokens ?? 0} tokens`,
        )
      }
    }

    // Append Claude's response to the conversation
    messages.push({ role: 'assistant', content: response.content })

    // If Claude is done, extract the text output
    if (response.stop_reason === 'end_turn') {
      const textBlock = response.content.find(
        (b: ContentBlock) => b.type === 'text',
      ) as Anthropic.Messages.TextBlock | undefined

      if (!textBlock?.text) {
        throw new Error('Claude returned end_turn but no text block found.')
      }

      return textBlock.text
    }

    // Otherwise handle tool calls
    if (response.stop_reason === 'tool_use') {
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = []

      for (const block of response.content) {
        if (block.type !== 'tool_use') continue

        const toolUse = block as ToolUseBlock
        const input = toolUse.input as { url: string }

        console.log(`  → fetching: ${input.url}`)
        const content = await fetchUrlText(input.url)
        console.log(
          `    ✓ ${content.startsWith('[fetch failed') ? 'FAILED' : `${content.length.toLocaleString()} chars`}`,
        )

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content,
        })
      }

      // Append all tool results as a single user turn
      messages.push({ role: 'user', content: toolResults })
      continue
    }

    // Unexpected stop reason — surface it
    throw new Error(`Unexpected stop_reason: ${response.stop_reason}`)
  }
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2)

  if (args.length < 2) {
    console.error(
      'Usage: npx tsx intake-market.ts "City Name" URL1 [URL2 URL3]\n\nExample:\n  npx tsx intake-market.ts "Venice Beach" https://www.lacity.org/highlights/short-term-rentals',
    )
    process.exit(1)
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    console.error(
      'Error: ANTHROPIC_API_KEY is not set.\nSet it in your environment or create a .env file in the scripts/ directory.',
    )
    process.exit(1)
  }

  const cityName = args[0]
  const sourceUrls = args.slice(1)
  const slug = slugify(cityName)

  let draft: string
  try {
    draft = await runIntake(cityName, sourceUrls)
  } catch (err) {
    if (err instanceof Anthropic.APIError) {
      console.error(`\nAnthropic API error: ${err.status} — ${err.message}`)
    } else {
      console.error('\nUnexpected error:', err)
    }
    process.exit(1)
  }

  // Write draft file
  const draftsDir = path.join(__dirname, 'drafts')
  fs.mkdirSync(draftsDir, { recursive: true })

  const outPath = path.join(draftsDir, `${slug}.ts`)
  const header = [
    `// STR Comply — Market Intake Draft`,
    `// City:      ${cityName}`,
    `// Slug:      ${slug}`,
    `// Generated: ${new Date().toISOString()}`,
    `// Sources:`,
    ...sourceUrls.map((u) => `//   ${u}`),
    `//`,
    `// REVIEW BEFORE COMMITTING:`,
    `//   1. Check every field marked "// TODO: verify"`,
    `//   2. Confirm summary word count (120–180 words)`,
    `//   3. Verify all source URLs resolve correctly`,
    `//   4. Paste into backend/data/markets.ts inside the markets[] array`,
    `//   5. Re-run: DATABASE_URL=$(grep '^DATABASE_URL=' ../.env.local | cut -d'=' -f2-) npx tsx prisma/seed.ts`,
    ``,
  ].join('\n')

  fs.writeFileSync(outPath, header + draft + '\n')

  console.log(`\n✓ Draft written to: ${path.relative(process.cwd(), outPath)}`)
  console.log(`\nNext steps:`)
  console.log(`  1. Review the draft — check all "// TODO: verify" comments`)
  console.log(`  2. Edit any fields that need correction`)
  console.log(`  3. Paste into backend/data/markets.ts → markets[] array`)
  console.log(`  4. Re-seed: cd frontend && DATABASE_URL=... npx tsx prisma/seed.ts\n`)
}

main()
