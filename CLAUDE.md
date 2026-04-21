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
| PRD | `Reference Artifacts/STR_Comply_PRD_v2.3.md` | v2.3 | Source Discovery Agent + Approval Flow added; RICE table updated; refresh model and constraints updated |
| SRD | `Reference Artifacts/STR_Comply_SRD_v1.4.md` | v1.4 | MarketSource schema expanded (sourceStatus, brokenSince, discoveryAttempts, replacesId); section 15A expanded (source discovery + approval flow); new API endpoint /api/admin/approve-source; new lib files documented; project structure and DoD checklist updated |
| ICP | `Reference Artifacts/STR_Comply_ICP_v1.0.md` | v1.0 | Ideal client profile and Marcus Chen persona |
| Accessibility Spec | `Reference Artifacts/STR_Comply_AccessibilitySpec_v1.0.md` | v1.0 | WCAG 2.1 AA implementation spec; component-level criteria and dev checklist |
| Design System | `Reference Artifacts/STR_Comply_DesignSystem_v1.0.md` | v1.0 | Token definitions, component patterns, color palette, typography, anti-patterns — load into context for all UI work |

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

See @lessons.md for rules learned during this build.

---

## Team and build context

- PM / FE lead: building UI and backend locally
- Group partners: collaborating via GitHub
- Current phase: **Auth complete — tests and README are next**

**Phase summary:**
- UI-first phase: complete. Frontend components, pages, and mock data are done.
- Backend phase: complete. Prisma 7 + Neon DB wired, all API routes live, 5 LA-area markets seeded.
- Auth phase: complete. NextAuth v5 + Resend magic link wired. Custom `PrismaRawAdapter` in `lib/auth-adapter.ts`. All 3 watchlist routes are auth-gated.
- Compliance monitor phase: complete. Background agent built (off by default via `COMPLIANCE_MONITOR_ENABLED`). Source discovery agent and HMAC approval flow both shipped.

**Key CLI commands (Prisma 7 requires manual DATABASE_URL prefix):**
```bash
# Run a migration
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d'=' -f2-) npx prisma migrate dev --name <name>

# Re-seed the database
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d'=' -f2-) npx tsx prisma/seed.ts

# Start dev server (reads .env.local automatically)
npm run dev
```

---

## Approved tech stack

- Next.js (App Router) — TypeScript
- Tailwind CSS — no component libraries beyond utility classes
- Prisma 7 + `@prisma/adapter-pg` + `pg` — ORM and DB connection
- Zod — input validation on all API route handlers
- `tsx` — seed script runtime
- PostgreSQL via **Neon** (confirmed host)
- NextAuth / Auth.js — email magic link; **Resend** is the chosen email provider
- `@anthropic-ai/sdk` — used by compliance monitor agent only; not in the core user-facing request path
- `resend` npm package — used by compliance monitor for summary emails (distinct from the Resend NextAuth provider)
- Vercel — app hosting target
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
/Capstone/
  /backend/
    /data/
      markets.ts             ← canonical typed seed data; edit here to add/update markets
  /frontend/
    auth.ts                  ← NextAuth v5 config (Resend provider + PrismaRawAdapter)
    prisma.config.ts         ← Prisma 7 DB config (adapter + migrate settings)
    vercel.json              ← Vercel cron schedule (compliance monitor, Mon 9am UTC)
    /prisma/
      schema.prisma          ← 11 DB tables incl. NextAuth models + compliance monitor fields
      seed.ts                ← imports from backend/data/markets.ts and seeds DB
      /migrations/           ← committed migration history
    /lib/
      db.ts                  ← Prisma client singleton (server-only)
      session.ts             ← requireSession() — enforces auth on watchlist API routes
      auth-adapter.ts        ← custom NextAuth adapter using $queryRaw (replaces @auth/prisma-adapter)
      approval-token.ts      ← HMAC-SHA256 sign/verify for source approval email links (24h TTL)
      compliance-monitor.ts  ← compliance monitor agent core logic
      source-discoverer.ts   ← source discovery agent — Sonnet + web_search + Haiku validation gate
    /scripts/
      run-compliance-monitor.ts  ← local runner for compliance agent (loads .env.local)
      discover-sources.ts        ← on-demand CLI for single-market source discovery
      /discovery-output/         ← gitignored output directory for CLI discovery runs
    /app/
      /api/
        /auth/[...nextauth]/route.ts      ← NextAuth route handler
        /search/route.ts                  ← GET /api/search
        /markets/[slug]/route.ts          ← GET /api/markets/:slug
        /telemetry/route.ts               ← POST /api/telemetry
        /watchlist/route.ts               ← GET + POST /api/watchlist
        /watchlist/[marketSlug]/route.ts  ← DELETE /api/watchlist/:marketSlug
        /cron/compliance-monitor/route.ts ← GET /api/cron/compliance-monitor (Vercel cron)
        /admin/approve-source/route.ts    ← POST /api/admin/approve-source?token=...
lessons.md             ← error log and learned rules (project root)
```

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
- Automated scraping or change monitoring — **Note:** a backend compliance monitor agent has been built as a maintainer tool (off by default via `COMPLIANCE_MONITOR_ENABLED`). User-facing change alerts remain out of scope.
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
