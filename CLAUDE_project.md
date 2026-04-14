# STR Comply — Project Claude Instructions
# Stored at: ./CLAUDE.md (project root, committed to git)
# Shared with: full team (PM, group partners, BE engineer)
# Global overrides: ~/.claude/CLAUDE.md applies first; rules here take precedence.

---

## Reference Artifacts — Current Versions

Always reference these paths when reading product context. When a new version is created,
update this table before anything else.

| Artifact | Current File | Version | Notes |
| :--- | :--- | :--- | :--- |
| PRD | `Reference Artifacts/PH-1_  PRD STR_Comply_PRD_v2.0_MR.docx.md` | v2.1 | Capstone revision, MVP scope narrowed |
| SRD | `Reference Artifacts/STR_Comply_SRD_v1.1.md` | v1.1 | Added `jurisdictionLevel` to `MarketRule` schema and enumeration |
| ICP | `Reference Artifacts/ICP_One_Pager.md` | v1.0 | Ideal client profile and Marcus Chen persona |
| Accessibility Spec | `Reference Artifacts/STR_Comply_Accessibility_Spec_v1.0.md` | v1.0 | WCAG 2.1 AA implementation spec; component-level criteria and dev checklist |

New versions are only created when scope changes. Until then, the files above are the source of truth.

---

## Artifact Versioning — How It Works

**When to create a new version:**
- A feature is added, removed, or descoped
- A key product or architecture decision changes
- A new build phase begins
- Any requirement changes that would affect how the BE engineer or a new contributor understands the product

**Versioning convention:**
- `STR_Comply_PRD_v{major}.{minor}.md` — major bump for scope changes; minor bump for clarifications
- `STR_Comply_SRD_v{major}.{minor}.md` — same rules; SRD version should stay in sync with the PRD version it was derived from

**File location:** `Reference Artifacts/`

**What to do when creating a new version:**
1. Copy the latest version file to a new filename with the incremented version number
2. Make the changes in the new file only — do not edit older versions
3. Update the "Reference Artifacts — Current Versions" table in this file (`CLAUDE_project.md`) to point to the new file
4. Add a brief changelog note at the top of the new artifact file explaining what changed and why
5. Old versions stay in `Reference Artifacts/` as history — do not delete them

**Changelog format** (add at the top of each new version file):

```
## Changelog
- v{version} ({date}): {what changed and why}
```

---

## What this product is

STR Comply is a desktop-first, high-trust short-term rental compliance lookup tool.
It helps STR investors quickly determine whether a market is worth pursuing by
providing a structured compliance summary, source-linked rule cards, freshness
indicators, and a saved market watchlist.

This is NOT a chat product. It is NOT an AI answer engine. Compliance summaries are
pre-written, human-reviewed content stored in the database — not generated at runtime.

See @docs/lessons.md for rules learned during this build.

---

## Team and build context

- PM / FE lead: building UI locally, will push to GitHub for team collaboration
- Group partners: collaborating via GitHub
- BE engineer: joining later to implement database, API routes, and auth
- Current phase: UI-first — frontend is built before backend is wired

**How to handle the UI-first phase:**
- Build all frontend in `/frontend` as a standalone folder
- Use static mock data (typed local fixtures) to simulate real API responses
- Stub API shapes as TypeScript interfaces in `/frontend/src/types/` so the BE
  engineer knows exactly what each endpoint must return
- Do NOT make real API calls or connect to a database during this phase
- When a component needs data, import it from `/frontend/src/mocks/` — never
  hardcode data directly inside components

---

## Approved tech stack

**Frontend (current phase):**
- Next.js (App Router) — TypeScript
- Tailwind CSS for styling
- No component libraries beyond Tailwind utility classes
- Static mock data from typed fixture files

**Full stack (when BE joins):**
- Next.js (App Router) — single codebase, frontend + API routes
- PostgreSQL + Prisma ORM
- NextAuth / Auth.js — email magic link or credentials
- Tailwind CSS
- Vercel (app hosting) + Neon or Supabase (database)
- Telemetry events logged to Postgres

**NEVER introduce without asking:**
- Redux or any global state management library
- GraphQL
- LangChain, LlamaIndex, or any agent framework
- Vector databases or embedding pipelines
- Kafka, queues, or background job platforms
- Elasticsearch or OpenSearch
- Any map SDK beyond basic geocoding if needed
- Any AI SDK for runtime inference — summaries are stored content, not generated

---

## Project structure

```
/frontend              ← standalone FE (current phase)
  /src
    /app               ← Next.js App Router pages
    /components        ← reusable UI components
    /mocks             ← typed static fixture data (replaces API during UI phase)
    /types             ← shared TypeScript interfaces (API contract stubs)
    /lib               ← utility functions, formatters, helpers
/docs
  lessons.md           ← error log and learned rules (see instructions below)
  be-handoff.md        ← API contract and schema reference for BE engineer
```

When BE joins, the full stack structure from the SRD applies:
`/app`, `/components`, `/lib`, `/prisma`, `/data`, `/types`

---

## Pages to build

1. `/` — Home / search page
2. `/market/[slug]` — Market result page
3. `/watchlist` — Saved markets (auth-gated; mock auth state for UI phase)
4. `/login` — Auth page (stub only during UI phase)
5. Unsupported market state — inline or `/unsupported` page

---

## Core UI requirements — enforce on every component

Every result page MUST include in this order:
1. Market header (name, region)
2. Compliance summary card (STR status, permit required, owner occupancy)
3. Key rule cards
4. Source links (open in new tab, always)
5. Freshness / last reviewed badge
6. Watchlist save/remove action
7. Disclaimer (see exact language below)

**Compliance status values** — only these three, never freeform text:
- `allowed`
- `conditional`
- `not_allowed`

**Permit required values:** `yes` | `no` | `varies`
**Owner occupancy values:** `yes` | `no` | `varies`
**Freshness status values:** `fresh` | `review_due` | `needs_review`

Status badges must be visually distinct and glanceable. Never render status as plain
prose only.

---

## Disclaimer — required on every result view

Every market result page MUST include this text verbatim (or materially equivalent):

> This summary is for informational purposes only and is not legal advice. Always
> verify requirements using official municipal sources and consult a qualified
> attorney for high-stakes decisions.

Do not omit this. Do not paraphrase it into something weaker. This is a product
safety requirement, not a style preference.

---

## Mock data requirements (UI phase)

- All mock data lives in `/frontend/src/mocks/`
- Use 3–5 LA-area markets: Santa Monica, Los Angeles, West Hollywood, Pasadena,
  Malibu (or similar real markets)
- Each mock market must include: slug, name, county, strStatus, permitRequired,
  ownerOccupancyRequired, summary, lastReviewedAt, freshnessStatus, rules[], sources[]
- Sources must include a real-looking title, publisher, and URL (can be placeholder
  but must be structurally correct)
- Mock data must match the TypeScript interfaces in `/frontend/src/types/market.ts`
  exactly — this is the API contract for the BE engineer

---

## What is explicitly out of scope — do not build

- Runtime AI generation of compliance summaries
- Automated scraping or change monitoring
- Permit application workflows
- Alerts or notifications
- Payments or subscriptions
- Multi-user collaboration features
- Admin CMS UI
- Parcel-accurate geocoding
- Mobile-first layouts (desktop-first only)

If I ask for something that touches any of the above, flag it before building.

---

## Search logic — deterministic only

Search must resolve queries to markets using this priority order:
1. Exact slug match
2. Exact alias match
3. Normalized name match (case-insensitive, whitespace-trimmed)
4. Partial contains match
5. Unsupported fallback

Never guess or return a fuzzy match without high confidence. If the input cannot be
confidently mapped to a supported market, return the unsupported state — do not
hallucinate a result.

---

## Collaboration and git rules

- Do NOT commit directly to `main`
- Feature work goes on a branch; PR to main
- Never commit `.env` or `.env.local` files
- Always update `.env.example` when adding a new environment variable
- Keep commits focused — one logical change per commit with a clear message
- When BE engineer joins, update `docs/be-handoff.md` with any API or schema changes

---

## Telemetry events — log these, nothing else

- `search_performed`
- `result_viewed`
- `source_clicked`
- `market_saved`
- `market_removed`
- `unsupported_market_seen`

During UI phase, telemetry calls can be stubbed (console.log or no-op). Wire to
real endpoints when BE joins.

---

## Tone and content rules

- Professional, calm, trustworthy — never alarmist or salesy
- Summaries: 120–180 words max, plain English, no legalese, no unsupported certainty
- Source links: always labeled with title and publisher, always open in a new tab
- Never present results as definitive legal determinations
