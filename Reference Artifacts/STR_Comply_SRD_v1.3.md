# STR Comply — Software Requirements Document (SRD)
**Version:** 1.3
**Date:** April 17, 2026
**Derived From:** STR Comply PRD v2.2
**Product Type:** Desktop-first web application
**Primary Build Goal:** Enable Claude to implement a clean MVP with minimal extra libraries, minimal hidden assumptions, and low backend complexity.

## Changelog
- v1.3 (2026-04-17): Auth wired. Compliance monitor agent added. Schema updated with NextAuth models (Account, Session, VerificationToken), updated User model (emailVerified, image), and MarketSource.contentHash. Updated sections: 3.2, 5.1, 6.1, 12.2, 14, 23.1, 25, 27, 30. Added new section 15A (Compliance Monitor Agent).
- v1.2 (2026-04-13): Backend fully wired. Updated section 5.1 to reflect confirmed runtime stack (Prisma 7 + `@prisma/adapter-pg` + `pg`, Zod on all API route handlers, `tsx` for seed script, Neon confirmed as database host, Resend recommended for NextAuth magic link). Updated section 14.4 DELETE endpoint path to use `:marketSlug` (matches implemented route handler `[marketSlug]/route.ts`). Updated section 23.1 project structure to reflect actual post-backend file layout. Updated section 27 implementation order to note completed steps. Updated section 30 Definition of Done checklist to mark completed items.
- v1.1 (2026-04-13): Added `jurisdictionLevel` field to `MarketRule` model (section 12.2) and corresponding enumeration (section 13.10). This field identifies which level of government mandates each rule (city, county, or state). Field is nullable — not all rules will have a level assigned. Added `jurisdictionLevel` to the GET /api/markets/:slug rule shape (section 14.2). No other sections changed.
- v1.0 (2026-04-11): Initial SRD derived from PRD v2.1.

---

## 1. Purpose

This SRD translates the product requirements into implementation-ready software requirements for the STR Comply MVP.

The product is a desktop-first, high-trust short-term rental compliance lookup tool for a limited set of LA-area jurisdictions. Its purpose is to help STR investors quickly determine whether a market is worth pursuing for short-term rental use by providing:
- a supported-market lookup
- a compliance summary
- source-linked rule cards
- freshness metadata
- a lightweight watchlist

The MVP is intentionally constrained to reduce engineering complexity and avoid infrastructure-heavy systems.

---

## 2. Source Product Intent

The attached PRD defines the MVP as a narrow, desktop-first experience focused on:
- market/address lookup
- compliance summary card
- source-linked rule cards
- freshness indicator
- watchlist

It explicitly avoids:
- full production scraping pipelines
- parcel-accurate jurisdiction analysis
- permit workflow automation
- large-scale RAG
- automated change detection
- legal-advice positioning

This SRD preserves those constraints and turns them into concrete software requirements.

---

## 3. Product Scope

## 3.1 In Scope
1. Free-text search for a market or address
2. Mapping input to a supported jurisdiction
3. Display of structured compliance results
4. Plain-English grounded summary per market
5. Official source links
6. Last-reviewed / freshness status
7. User authentication for watchlist
8. Save/remove supported markets from watchlist
9. Unsupported market handling
10. Event telemetry

## 3.2 Out of Scope
1. Full geocoding precision across overlapping jurisdictions
2. Automated scraping or change monitoring — **Note:** a backend compliance monitor agent has been built as a maintainer tool (off by default via `COMPLIANCE_MONITOR_ENABLED`). User-facing change alerts remain out of scope for MVP. See section 15A.
3. Permit/license application workflows
4. Scenario modeling
5. Alerts/notifications
6. Payments/subscriptions
7. Multi-user collaboration
8. Admin CMS unless needed as a simple internal seed/update flow
9. Mobile-first design
10. AI-generated answers at runtime

---

## 4. Build Philosophy

The software should be built for:
- **clarity over cleverness**
- **structured data over dynamic AI generation**
- **few dependencies over framework sprawl**
- **predictable server-side behavior over agentic orchestration**
- **easy local setup over cloud-native complexity**

### Required engineering principles
1. Use a small, stable stack.
2. Prefer deterministic server logic.
3. Store curated market data in a structured relational schema.
4. Treat AI summaries as pre-generated content, not runtime chat output.
5. Avoid background jobs unless absolutely necessary.
6. Ship a complete MVP with one frontend app, one API/backend, one relational database.
7. Use built-in framework capabilities wherever possible.

---

## 5. Recommended Technical Stack

This section is normative. Claude should default to this stack unless the user explicitly overrides it.

## 5.1 Core Stack
- **Frontend + Backend Framework:** Next.js (App Router)
- **Language:** TypeScript
- **Database:** PostgreSQL — confirmed host: **Neon** (serverless PostgreSQL)
- **ORM:** Prisma — confirmed version: **Prisma 7** with `@prisma/adapter-pg` and `pg` package (required for Prisma 7 connection handling; config lives in `prisma.config.ts`)
- **Input Validation:** Zod — applied on all API route handlers
- **Seed Runtime:** `tsx` — used to execute `prisma/seed.ts` directly
- **Authentication:** NextAuth v5 (Auth.js) with Resend magic link + **custom `PrismaRawAdapter`** (`lib/auth-adapter.ts`). Do NOT use `@auth/prisma-adapter` — it is incompatible with Prisma 7 + `@prisma/adapter-pg` (model accessors return `undefined`).
- **AI SDK:** `@anthropic-ai/sdk` — used by compliance monitor agent only; not in the core user-facing request path
- **Email SDK:** `resend` npm package — used by compliance monitor for summary emails (distinct from the Resend provider in NextAuth config)
- **Cron scheduling:** `vercel.json` — defines weekly Vercel cron job targeting `/api/cron/compliance-monitor`
- **Styling:** Tailwind CSS
- **Hosting target:** Vercel for app, Neon for database
- **Telemetry:** simple server-side and client-side event logging into Postgres initially

### Environment variables
| Variable | Purpose | Required for |
|---|---|---|
| `DATABASE_URL` | Neon PostgreSQL connection string — **omit `channel_binding=require`** | All |
| `AUTH_SECRET` | NextAuth session signing key | Auth |
| `AUTH_URL` | App base URL (e.g. `http://localhost:3001`) | Auth |
| `RESEND_KEY` | Resend API key for magic link emails | Auth + compliance agent |
| `ANTHROPIC_API_KEY` | Anthropic API key for compliance monitor AI calls | Compliance agent |
| `COMPLIANCE_MONITOR_ENABLED` | Set `true` to enable agent; `false` (default) exits immediately | Compliance agent |
| `CRON_SECRET` | Bearer token protecting `/api/cron/compliance-monitor` | Compliance agent |
| `COMPLIANCE_REPORT_EMAIL` | Email address to receive run summary reports | Compliance agent |

### Prisma 7 CLI note
Prisma CLI does not auto-load `.env.local`. Prefix DB commands manually:
```bash
# Run a migration
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d'=' -f2-) npx prisma migrate dev --name <name>

# Re-seed the database
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d'=' -f2-) npx tsx prisma/seed.ts
```

## 5.2 Why this stack
- One codebase
- Minimal deployment complexity
- Strong TypeScript ergonomics
- Easy API route creation
- Good desktop UX velocity
- Easy auth integration
- Easy database-backed watchlist and telemetry
- Avoids separate frontend/backend repos

## 5.3 Dependencies to avoid unless required
- Redux
- GraphQL
- Kafka/queues
- Elasticsearch/OpenSearch
- vector databases
- LangChain or agent frameworks
- component libraries beyond basic utility styling
- heavy map SDKs
- state machine frameworks
- background worker platforms

---

## 6. System Architecture

## 6.1 High-Level Architecture

```text
User Browser
   |
   v
Next.js Web App
   |- Server Components / UI Pages
   |- API Route Handlers
   |- Auth Layer (NextAuth v5 + Resend magic link)
   |
   v
PostgreSQL (Neon)
   |- User, Account, Session, VerificationToken  ← NextAuth tables
   |- Market, MarketAlias, MarketRule, MarketSource (contentHash added)
   |- WatchlistItem, TelemetryEvent

Compliance Monitor Agent (background — off by default)
   |- Trigger: Vercel cron → GET /api/cron/compliance-monitor (weekly, Mon 9am UTC)
   |- Kill switch: COMPLIANCE_MONITOR_ENABLED=false → exits immediately, zero cost
   |- Step 1: SHA-256 hash check per source URL (zero AI cost if unchanged)
   |- Step 2: Haiku 4.5 pre-screen (cheap — filters cosmetic page changes)
   |- Step 3: Sonnet 4.6 full diff (only when Haiku confirms a real change)
   |- Output: auto-updates low-risk fields; flags high-risk changes via Resend email
```

## 6.2 Architecture Decision
The MVP shall use **structured market records** prepared ahead of time. Search results shall be resolved against this curated dataset.

There shall be **no runtime LLM dependency** for the user-facing lookup flow.

## 6.3 Rationale
This directly supports the PRD requirement that trust and grounding matter more than maximal automation, and that the MVP should rely on curated official source material and pre-generated summaries rather than infrastructure-heavy AI systems.

---

## 7. User Roles

## 7.1 Anonymous User
May:
- land on home page
- search supported markets
- view results
- click source links
- see unsupported market messaging

May not:
- save watchlist items

## 7.2 Authenticated User
May do everything anonymous users can do, plus:
- save market to watchlist
- remove market from watchlist
- view watchlist page

## 7.3 Internal Maintainer (Optional, Non-MVP UI)
May:
- update seeded market data directly via database, Prisma studio, or seed scripts

There is no requirement for an internal admin UI in MVP.

---

## 8. Core User Flows

## 8.1 Supported Market Lookup
1. User enters address or market name in search input
2. System normalizes input
3. System attempts to map input to supported market
4. If supported:
   - return market result page
   - show status fields
   - show summary
   - show rule cards
   - show freshness
   - allow save if authenticated
5. Log telemetry events

## 8.2 Unsupported Market
1. User enters unsupported location
2. System cannot resolve to supported market
3. System displays:
   - not currently supported message
   - list of supported markets
   - optional CTA to save interest later (not required for MVP)
4. Log unsupported market event

## 8.3 Save to Watchlist
1. Authenticated user clicks save
2. System creates watchlist record if not present
3. UI updates to saved state
4. Log event

## 8.4 Remove from Watchlist
1. Authenticated user clicks remove
2. System deletes watchlist record
3. UI updates
4. Log event

---

## 9. Functional Requirements

## 9.1 Search / Lookup

### FR-1
The system shall provide a single search input on the home page.

### FR-2
The system shall accept free-text market names, city names, ZIP-like text, and street-address-like text.

### FR-3
The system shall normalize user input by:
- trimming whitespace
- lowercasing for matching
- stripping duplicate spaces
- optionally removing punctuation where safe

### FR-4
The system shall resolve search input to one supported market using deterministic matching rules.

### FR-5
The system shall support exact alias matching for each market via a predefined alias list.

### FR-6
If the input resembles a street address, the system may use a simple rules-based parser or optional geocoding adapter, but the MVP must still gracefully degrade to supported-market matching without requiring precise parcel-level analysis.

### FR-7
The system shall return one of:
- supported market result
- unsupported market response
- invalid/empty query validation state

## 9.2 Compliance Result

### FR-8
For a supported market, the system shall display:
- market name
- county / region if applicable
- STR status: `allowed | conditional | not_allowed`
- permit required: `yes | no | varies`
- owner occupancy required: `yes | no | varies`
- summary text
- last reviewed date
- freshness state
- source list

### FR-9
The system shall display a clear disclaimer that the result is not legal advice and users should validate with official sources.

### FR-10
The system shall display source links prominently above or adjacent to deeper detail.

## 9.3 Rule Cards

### FR-11
The system shall display rule cards derived from structured fields, such as:
- STR legality status
- permit/license requirement
- owner-occupancy requirement
- notable restrictions
- enforcement or cap notes if available
- tax/registration notes if included in curated data

### FR-12
Each rule card shall contain:
- title
- concise value or status
- optional explanation
- one or more linked official sources
- optional jurisdiction level (city, county, or state) indicating which government level mandates the rule

## 9.4 Freshness

### FR-13
Each supported market shall include:
- `last_reviewed_at`
- `freshness_status`

### FR-14
`freshness_status` shall be one of:
- `fresh`
- `review_due`
- `needs_review`

### FR-15
The UI shall visually distinguish freshness states.

### FR-16
If a market is marked `needs_review`, the UI shall still show the result but indicate that users should verify source details carefully.

## 9.5 Watchlist

### FR-17
Authenticated users shall be able to save a supported market.

### FR-18
A user shall not be able to save the same market more than once.

### FR-19
The watchlist page shall list the user's saved markets with:
- market name
- status
- permit signal
- owner occupancy signal
- freshness state
- date saved

### FR-20
Users shall be able to remove saved markets from the watchlist.

## 9.6 Telemetry

### FR-21
The system shall record the following events:
- `search_performed`
- `result_viewed`
- `source_clicked`
- `market_saved`
- `market_removed`
- `unsupported_market_seen`

### FR-22
Each telemetry event shall store:
- event name
- timestamp
- anonymous session id or user id
- market id if applicable
- query text if applicable
- metadata JSON

---

## 10. Non-Functional Requirements

## 10.1 Performance
- Initial page load should feel fast on broadband desktop.
- Search-to-result flow should typically complete in under 2 seconds for supported markets, excluding third-party auth or cold-start issues.
- Save/remove watchlist actions should typically complete in under 1 second.

## 10.2 Reliability
- The app shall not depend on external runtime AI services for core result rendering.
- If database access fails, the UI shall show a recoverable error state rather than crash.

## 10.3 Security
- Authentication required for watchlist actions
- Server-side authorization checks on all watchlist mutations
- Input validation on all APIs (Zod)
- Use parameterized queries via ORM only
- No secrets exposed to client
- Basic rate limiting is recommended for search and auth endpoints

## 10.4 Accessibility
- WCAG 2.1 Level AA conformance target across all pages
- Keyboard-accessible search and result flow — all interactions reachable without a mouse
- Sufficient color contrast — minimum 4.5:1 for normal text, 3:1 for large text and UI components
- Semantic HTML and ARIA — correct landmark regions, form labels, button names
- Focus indicators visible on all interactive elements — never suppress outline without replacement
- Status indicators must not rely on color alone — shape or text must differentiate states
- External source links must announce they open in a new tab
- See `Reference Artifacts/STR_Comply_AccessibilitySpec_v1.0.md` for full implementation spec

## 10.5 Maintainability
- Strong typing end-to-end
- Shared domain types
- Seedable database
- Clear separation between data access, business logic, and UI rendering
- No duplicated status-mapping logic across components

---

## 11. Information Architecture

## 11.1 Pages
1. `/` — Home/search page
2. `/market/[slug]` — Market result page
3. `/watchlist` — Authenticated watchlist
4. `/login` — Auth page
5. `/unsupported` — Optional dedicated unsupported result page
6. `/api/*` — API routes

## 11.2 Primary Navigation
- Home
- Watchlist
- Sign in / Account

---

## 12. Data Model

This section is normative.

## 12.1 Entity Overview
- User
- Market
- MarketAlias
- MarketRule
- MarketSource
- WatchlistItem
- TelemetryEvent

## 12.2 Suggested Prisma Schema Shape

```prisma
model User {
  id             String          @id @default(cuid())
  email          String          @unique
  emailVerified  DateTime?       // required by NextAuth
  name           String?
  image          String?         // required by NextAuth
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  accounts       Account[]
  sessions       Session[]
  watchlistItems WatchlistItem[]
  telemetry      TelemetryEvent[]
}

// NextAuth — Account, Session, VerificationToken
// Required for magic-link auth. Do not remove.
model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String? @db.Text
  access_token      String? @db.Text
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String? @db.Text
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

model Market {
  id                    String          @id @default(cuid())
  slug                  String          @unique
  name                  String
  stateCode             String          @default("CA")
  countyName            String?
  regionLabel           String?
  supportStatus         String          @default("supported")
  strStatus             String
  permitRequired        String
  ownerOccupancyRequired String
  summary               String
  notableRestrictions   String?
  lastReviewedAt        DateTime
  freshnessStatus       String
  createdAt             DateTime        @default(now())
  updatedAt             DateTime        @updatedAt

  aliases               MarketAlias[]
  rules                 MarketRule[]
  sources               MarketSource[]
  watchlistItems        WatchlistItem[]
  telemetry             TelemetryEvent[]
}

model MarketAlias {
  id        String   @id @default(cuid())
  marketId  String
  alias     String
  createdAt DateTime @default(now())

  market    Market   @relation(fields: [marketId], references: [id], onDelete: Cascade)

  @@unique([marketId, alias])
  @@index([alias])
}

model MarketRule {
  id                String   @id @default(cuid())
  marketId          String
  ruleKey           String
  label             String
  value             String
  details           String?
  displayOrder      Int      @default(0)
  jurisdictionLevel String?  // nullable — 'city' | 'county' | 'state'; not all rules have a level
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  market            Market   @relation(fields: [marketId], references: [id], onDelete: Cascade)

  @@index([marketId, ruleKey])
}

model MarketSource {
  id           String   @id @default(cuid())
  marketId     String
  title        String
  url          String
  sourceType   String
  publisher    String?
  displayOrder Int      @default(0)
  contentHash  String?  // SHA-256 of stripped page text — used by compliance monitor to skip unchanged sources
  createdAt    DateTime @default(now())

  market       Market   @relation(fields: [marketId], references: [id], onDelete: Cascade)

  @@index([marketId])
}

model WatchlistItem {
  id         String   @id @default(cuid())
  userId     String
  marketId   String
  createdAt  DateTime @default(now())

  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  market     Market   @relation(fields: [marketId], references: [id], onDelete: Cascade)

  @@unique([userId, marketId])
  @@index([userId])
}

model TelemetryEvent {
  id          String   @id @default(cuid())
  userId       String?
  marketId     String?
  sessionId    String?
  eventName    String
  queryText    String?
  metadataJson Json?
  createdAt    DateTime @default(now())

  user         User?   @relation(fields: [userId], references: [id], onDelete: SetNull)
  market       Market? @relation(fields: [marketId], references: [id], onDelete: SetNull)

  @@index([eventName, createdAt])
  @@index([marketId])
  @@index([userId])
}
```

---

## 13. Enumerations and Business Rules

## 13.1 STR Status
Allowed values:
- `allowed`
- `conditional`
- `not_allowed`

## 13.2 Permit Required
Allowed values:
- `yes`
- `no`
- `varies`

## 13.3 Owner Occupancy Required
Allowed values:
- `yes`
- `no`
- `varies`

## 13.4 Freshness Status
Allowed values:
- `fresh`
- `review_due`
- `needs_review`

## 13.5 Support Status
Allowed values:
- `supported`
- `unsupported`
- `archived`

## 13.6 Business Rule: Search Mapping
The system shall map queries to markets in this order:
1. exact slug match
2. exact alias match
3. normalized exact name match
4. normalized contains match
5. optional address-to-market adapter
6. unsupported fallback

## 13.7 Business Rule: Watchlist Limits
For MVP, user watchlist may be limited to 25 saved markets. If limit reached, show clear message.

## 13.8 Business Rule: Source Requirement
Each supported market must have at least 1 official source before it can be published.

## 13.9 Business Rule: Summary Requirement
Each supported market must have a non-empty plain-English summary reviewed by a human before publication.

## 13.10 Jurisdiction Level
The `jurisdictionLevel` field on `MarketRule` identifies which tier of government mandates the rule.

Allowed values:
- `city` — rule is set by the city or municipality
- `county` — rule is set by the county
- `state` — rule is set by state law (e.g. California Coastal Act)

This field is **optional/nullable**. Rules without a confirmed jurisdiction level may omit it. The UI renders a small labeled tag (City / County / State) when the value is present.

---

## 14. API Requirements

The app may use server actions where appropriate, but the following API contract should exist conceptually even if implemented as route handlers.

## 14.1 GET /api/search
### Purpose
Resolve a free-text query to a supported market or unsupported response.

### Query Params
- `q` (string, required)

### Response: Supported
```json
{
  "type": "supported",
  "market": {
    "id": "mkt_123",
    "slug": "santa-monica",
    "name": "Santa Monica",
    "strStatus": "conditional"
  },
  "redirectUrl": "/market/santa-monica"
}
```

### Response: Unsupported
```json
{
  "type": "unsupported",
  "normalizedQuery": "pasadena"
}
```

### Validation
- return 400 for empty query after trim

## 14.2 GET /api/markets/:slug
### Purpose
Return structured market detail.

### Response
```json
{
  "id": "mkt_123",
  "slug": "santa-monica",
  "name": "Santa Monica",
  "countyName": "Los Angeles County",
  "strStatus": "conditional",
  "permitRequired": "yes",
  "ownerOccupancyRequired": "yes",
  "summary": "Short-term rentals are conditionally allowed...",
  "notableRestrictions": "Primary residence requirement applies.",
  "lastReviewedAt": "2026-04-01T00:00:00.000Z",
  "freshnessStatus": "fresh",
  "rules": [
    {
      "ruleKey": "permit_required",
      "label": "Permit / Registration",
      "value": "Required",
      "details": "City registration required.",
      "displayOrder": 1,
      "jurisdictionLevel": "city"
    }
  ],
  "sources": []
}
```

### Rule shape note
`jurisdictionLevel` is nullable — omit the key or pass `null` for rules where the level is unknown.

## 14.3 POST /api/watchlist
### Auth
Required

### Body
```json
{
  "marketId": "mkt_123"
}
```

### Behavior
- create watchlist item if absent
- return 201 on create
- return 200 if already saved

## 14.4 DELETE /api/watchlist/:marketSlug
### Auth
Required

### Route param
`:marketSlug` — the market's slug string (e.g. `santa-monica`). The route handler is at `app/api/watchlist/[marketSlug]/route.ts`.

### Behavior
- resolve market by slug, then remove watchlist item for current user if exists
- return 204 on success

## 14.5 GET /api/watchlist
### Auth
Required

### Returns
List of saved markets for current user

## 14.6 POST /api/telemetry
### Purpose
Record telemetry event

### Body
```json
{
  "eventName": "source_clicked",
  "marketId": "mkt_123",
  "queryText": "Santa Monica STR",
  "metadata": {
    "sourceId": "src_456"
  }
}
```

### Notes
This may also be recorded server-side directly without a public endpoint for some events.

## 14.7 GET /api/cron/compliance-monitor
### Auth
`Authorization: Bearer {CRON_SECRET}` header required. Returns 401 if missing or incorrect.
Vercel injects this automatically when calling its own cron routes.

### Purpose
Weekly trigger for the compliance monitor agent. Called by Vercel cron every Monday at 9am UTC (configured in `vercel.json`). Can also be triggered manually for testing.

### Behavior
- If `COMPLIANCE_MONITOR_ENABLED !== 'true'` → returns `{ ok: true }` immediately, zero cost
- Otherwise → runs the full compliance monitor pipeline and returns when complete

### Response
```json
{ "ok": true }
```

---

## 15. Search Logic Requirements

## 15.1 Matching Strategy
The search system must be simple, deterministic, and maintainable.

### Minimum required search behavior
- exact market name match
- exact alias match
- case-insensitive matching
- whitespace normalization
- partial match fallback
- address-like input handling via alias/city extraction or optional adapter

## 15.2 Address Handling Strategy
Because parcel-accurate geocoding is out of scope, the MVP shall not claim exact parcel-level legal determination.

If geocoding is added, it must be used only to infer candidate jurisdiction for supported markets and must not be presented as legal certainty.

## 15.3 Unsupported Handling
If the system cannot confidently map input to a supported market, it must return unsupported rather than guess.

---

## 15A. Compliance Monitor Agent

This section documents the background compliance monitoring system. It is a maintainer tool — not user-facing — and is off by default.

### 15A.1 Purpose
Automates freshness checking for market source URLs. Detects regulatory changes in official city/county pages and either auto-updates low-risk content fields or flags high-risk changes for human review.

### 15A.2 Kill Switch
The agent checks `COMPLIANCE_MONITOR_ENABLED` at startup. If the value is not `'true'`, it exits immediately with zero API calls and zero cost. Set to `false` in Vercel environment variables to pause; delete the `vercel.json` cron entry and redeploy to stop the cron entirely.

### 15A.3 Two-Model Cost Strategy
To minimize API cost, the agent uses a three-stage pipeline per source URL:

| Stage | Tool | Cost | Condition |
|---|---|---|---|
| 1 | SHA-256 hash comparison | $0.00 | Always runs — skips if hash matches stored `contentHash` |
| 2 | Haiku 4.5 pre-screen | ~$0.001/call | Only if hash changed — filters cosmetic page changes |
| 3 | Sonnet 4.6 full diff | ~$0.01/call | Only if Haiku confirms a meaningful regulatory change |

Estimated cost: **< $0.05/month** at current scale (5 markets, ~3 sources each, weekly cadence, ~80% cache-hit rate).

### 15A.4 Risk Classification

| Field | Risk Level | Action |
|---|---|---|
| `strStatus`, `permitRequired`, `ownerOccupancyRequired` | **High** | Set `freshnessStatus: needs_review`, store diff + evidence quote, send email — do NOT auto-write |
| `summary`, `notableRestrictions`, rule `details`, `codeRef` | **Low** | Auto-update DB field, set `freshnessStatus: fresh`, log change |
| Source URL returning 404 or timeout | **Broken** | Flag source, include in email report |

### 15A.5 Run Schedule
- **Automated:** Vercel cron calls `GET /api/cron/compliance-monitor` every Monday at 9am UTC
- **Local / on-demand:** `npx tsx scripts/run-compliance-monitor.ts` (loads `.env.local` automatically)
- **Smart scheduling:** `fresh` markets only run monthly (`lastReviewedAt` < 30 days → skip); `review_due` and `needs_review` markets run every weekly cycle

### 15A.6 Files
| File | Purpose |
|---|---|
| `lib/compliance-monitor.ts` | Core agent logic — fetch, hash, AI calls, DB writes, email |
| `scripts/run-compliance-monitor.ts` | Local runner — loads `.env.local`, calls the lib |
| `app/api/cron/compliance-monitor/route.ts` | Vercel cron HTTP endpoint |
| `vercel.json` | Cron schedule configuration |

---

## 16. UI Requirements

## 16.1 Home Page
Must include:
- clear product purpose statement
- search input
- supported market examples or list
- trust-forward messaging
- optional disclaimer

## 16.2 Result Page
Must include the following sections in this approximate order:
1. Market header
2. Compliance summary card
3. Key rule cards
4. Source links
5. Freshness / last reviewed metadata
6. Watchlist action
7. Disclaimer

## 16.3 Compliance Summary Card
Must visually emphasize:
- STR allowed / conditional / not allowed
- permit required
- owner occupancy
- short summary

Status indicators should be glanceable and easy to scan.

## 16.4 Source List
Each source item must show:
- title
- publisher if available
- external link indicator

Clicking a source must open in a new tab and log telemetry.

## 16.5 Watchlist Page
Must show an empty state if no saved markets exist.

Each saved item should link back to the market result page.

## 16.6 Unsupported State
Must include:
- message that market is not currently covered
- supported markets list or examples
- explanation that current MVP only covers limited jurisdictions

---

## 17. Content Requirements

## 17.1 Summary Content Rules
Summaries must:
- be concise
- avoid legalese where possible
- avoid unsupported certainty
- reflect structured source-backed facts
- not exceed approximately 120 to 180 words for MVP

## 17.2 Disclaimer Language
Every result page must include language materially equivalent to:

> This summary is for informational purposes only and is not legal advice. Always verify requirements using official municipal sources and consult a qualified attorney for high-stakes decisions.

## 17.3 Tone
- professional
- calm
- trustworthy
- not alarmist
- not salesy
- not overconfident

---

## 18. Seed Data Requirements

The MVP shall ship with seed data for approximately 5–10 supported LA-area markets.

Each market seed record must include:
- slug
- name
- aliases
- structured status fields
- summary
- last reviewed date
- freshness status
- at least one rule row (with optional `jurisdictionLevel`)
- at least one official source row

## 18.1 Seed File Structure
Canonical seed data lives in `backend/data/markets.ts` — a typed array shared across the project. The seed script at `frontend/prisma/seed.ts` imports from this file.

**Do not duplicate market data** across multiple files. Edit `backend/data/markets.ts` to add or update markets, then re-run the seed script.

```bash
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d'=' -f2-) npx tsx prisma/seed.ts
```

---

## 19. Error Handling Requirements

## 19.1 User Input Errors
- Empty query: show inline validation
- Unsupported market: show supported-coverage messaging
- Network error: show retry state

## 19.2 Server Errors
- Search endpoint errors return structured JSON
- UI must present a generic, non-technical error message
- Server must log technical details internally

## 19.3 Auth Errors
- Unauthenticated save attempts redirect to login or open sign-in prompt
- Unauthorized access to watchlist APIs returns 401/403 as appropriate

---

## 20. Observability and Analytics

## 20.1 Required Events
- `search_performed`
- `result_viewed`
- `source_clicked`
- `market_saved`
- `market_removed`
- `unsupported_market_seen`

## 20.2 Useful Metadata
- query length
- normalized query
- matched market slug
- source clicked
- auth state
- referrer page

## 20.3 MVP Analytics Implementation
Store telemetry directly in Postgres first.
Do not add third-party analytics unless explicitly requested.

---

## 21. Testing Requirements

## 21.1 Unit Tests
Must cover:
- query normalization
- market matching
- watchlist create/remove logic
- enum/status formatting helpers

## 21.2 Integration Tests
Must cover:
- search to supported result
- search to unsupported result
- authenticated save/remove watchlist
- access control for watchlist routes

## 21.3 Manual QA Scenarios
1. Search supported city by exact name
2. Search supported city by alias
3. Search unsupported city
4. Save market while signed in
5. Attempt save while signed out
6. Click source link
7. View fresh vs needs-review states
8. Remove saved market
9. Load watchlist empty state

---

## 22. Acceptance Criteria

## 22.1 MVP Acceptance
The MVP is considered complete when:
1. A user can search a supported market and reliably get a structured result.
2. The result clearly displays legality status, permit signal, owner occupancy signal, summary, sources, and freshness.
3. Unsupported markets are handled gracefully.
4. An authenticated user can save and remove markets from a watchlist.
5. Core telemetry events are recorded.
6. The app can be locally run and seeded with minimal setup.
7. The codebase does not require runtime AI or complex extra services to function.

## 22.2 Local Development Acceptance
A new developer should be able to:
1. clone the repo
2. install dependencies
3. configure one `.env` file
4. run database migrations
5. seed the database
6. start the app
7. test the core flow in under 15 minutes

---

## 23. Developer Experience Requirements

Claude should produce:
- a clean project structure
- clear README
- `.env.example`
- seed script
- migration files
- typed domain helpers
- no dead code or placeholder frameworks not used by MVP

## 23.1 Actual Project Structure (post-backend build)

```text
/Capstone/
  /backend/
    /data/
      markets.ts             ← canonical typed seed data; edit here to add/update markets
  /frontend/
    auth.ts                  ← NextAuth v5 config (Resend provider + PrismaRawAdapter)
    prisma.config.ts         ← Prisma 7 DB config (adapter + migrate settings)
    vercel.json              ← Vercel cron schedule (compliance monitor, Mon 9am UTC)
    /prisma/
      schema.prisma          ← 11 DB tables incl. NextAuth models + contentHash (see section 12.2)
      seed.ts                ← imports from backend/data/markets.ts and seeds DB
      /migrations/           ← committed migration history
    /lib/
      db.ts                  ← Prisma client singleton (server-only)
      session.ts             ← server-side auth helper (requireSession); fully implemented
      auth-adapter.ts        ← custom NextAuth adapter using $queryRaw (replaces @auth/prisma-adapter)
      auth.ts                ← client-side useAuth() hook (wraps next-auth/react)
      compliance-monitor.ts  ← compliance monitor agent core logic
    /scripts/
      run-compliance-monitor.ts ← local runner for compliance agent (loads .env.local)
    /app/
      /api/
        /auth/
          /[...nextauth]/
            route.ts         ← NextAuth route handler
        /search/
          route.ts           ← GET /api/search
        /markets/
          /[slug]/
            route.ts         ← GET /api/markets/:slug
        /telemetry/
          route.ts           ← POST /api/telemetry
        /watchlist/
          route.ts           ← GET + POST /api/watchlist
          /[marketSlug]/
            route.ts         ← DELETE /api/watchlist/:marketSlug
        /cron/
          /compliance-monitor/
            route.ts         ← GET /api/cron/compliance-monitor (Vercel cron + manual trigger)
```

---

## 24. Security and Compliance Notes

- Do not present outputs as legal determinations.
- Do not imply completeness beyond supported coverage.
- Do not store unnecessary personal data.
- Use standard secure session handling.
- External links should be sanitized and validated before render where applicable.

---

## 25. Future-Compatible Extension Points

These are optional design considerations, not MVP requirements:
- admin ingestion interface
- user-facing change alerts / notification system (compliance monitor agent is built but alerts are not yet surfaced in the UI)
- expanded market coverage
- geocoding adapter
- runtime retrieval layer
- confidence review workflows

Claude may keep extension points cleanly isolated, but must not build them now.

---

## 26. Explicit Build Instructions for Claude

Claude should implement the product with the following interpretation:

1. Build a **single Next.js TypeScript app**.
2. Use **PostgreSQL + Prisma** for persistence.
3. Use **Tailwind CSS** for styling.
4. Implement **deterministic search**, not AI chat.
5. Treat all compliance summaries as **stored content**.
6. Keep the UI clean, desktop-first, and source-forward.
7. Avoid introducing any technology that requires a separate runtime unless essential.
8. Prefer server components and simple route handlers over elaborate client state.
9. Use typed seed data for the initial 5–10 markets.
10. Deliver production-quality MVP code, not a prototype with mocked core flows.

---

## 27. Suggested Implementation Order

1. ~~Initialize app, database, Prisma, auth, Tailwind~~ ✅
2. ~~Create schema and migrations~~ ✅
3. ~~Add typed market seed data~~ ✅ (5 LA-area markets seeded)
4. ~~Implement search normalization and matching~~ ✅
5. ~~Build home page search~~ ✅
6. ~~Build market result page~~ ✅
7. ~~Build source links and freshness badges~~ ✅
8. ~~Add watchlist APIs~~ ✅
9. ~~Add telemetry~~ ✅
10. ~~Wire auth~~ ✅ — NextAuth v5 + Resend + custom `PrismaRawAdapter` (`lib/auth-adapter.ts`)
11. ~~Watchlist UX~~ ✅ — activated once auth was wired
12. ~~Compliance monitor agent~~ ✅ — built; off by default (`COMPLIANCE_MONITOR_ENABLED=false`); see section 15A
13. Add tests and README polish ← **next**

---

## 28. Final Delivery Standard

The finished code should feel like:
- a narrow but real product
- easy to understand
- easy to run locally
- easy to extend later
- safe in how it frames legal information
- free of unnecessary architectural complexity

---

## 29. Appendix A — Example Typed Market Record

```ts
export const markets = [
  {
    slug: "santa-monica",
    name: "Santa Monica",
    stateCode: "CA",
    countyName: "Los Angeles County",
    aliases: ["santa monica", "sm"],
    strStatus: "conditional",
    permitRequired: "yes",
    ownerOccupancyRequired: "yes",
    summary:
      "Short-term rentals are conditionally allowed in Santa Monica, generally within a home-sharing framework tied to primary residency requirements. Users should review current city rules and registration requirements before relying on this market for acquisition decisions.",
    notableRestrictions:
      "Primary residence rules and registration obligations apply.",
    lastReviewedAt: "2026-04-01T00:00:00.000Z",
    freshnessStatus: "fresh",
    rules: [
      {
        ruleKey: "str_status",
        label: "STR Status",
        value: "Conditional",
        details: "Home-sharing rules apply.",
        jurisdictionLevel: "city"
      },
      {
        ruleKey: "permit_required",
        label: "Permit Required",
        value: "Yes",
        details: "Registration or permit process required.",
        jurisdictionLevel: "city"
      }
    ],
    sources: [
      {
        title: "City of Santa Monica Short-Term Rental Rules",
        url: "https://example.gov/str",
        sourceType: "official_program_page",
        publisher: "City of Santa Monica"
      }
    ]
  }
];
```

---

## 30. Appendix B — Definition of Done Checklist

- [x] Next.js app created
- [x] TypeScript enabled
- [x] Prisma schema complete (User + NextAuth models + MarketSource.contentHash; `jurisdictionLevel String?` on `MarketRule`)
- [x] PostgreSQL connected (Neon)
- [x] Seed script works
- [x] Search flow works
- [x] Supported result page complete
- [x] Unsupported state complete
- [x] Watchlist complete
- [x] Telemetry logging complete
- [x] Auth enforced for watchlist (NextAuth v5 + Resend magic link + custom PrismaRawAdapter)
- [x] Compliance monitor agent built (off by default — `COMPLIANCE_MONITOR_ENABLED=false`)
- [ ] Basic tests added
- [ ] README added
- [x] `.env.example` added
- [x] No runtime AI dependency in core user-facing flow
