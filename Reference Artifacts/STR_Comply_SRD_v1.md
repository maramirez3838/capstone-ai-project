# STR Comply — Software Requirements Document (SRD)
**Version:** 1.0  
**Date:** April 11, 2026  
**Derived From:** STR Comply PRD v2.1  
**Product Type:** Desktop-first web application  
**Primary Build Goal:** Enable Claude to implement a clean MVP with minimal extra libraries, minimal hidden assumptions, and low backend complexity.

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
2. Automated scraping or change monitoring
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
- **Database:** PostgreSQL
- **ORM:** Prisma
- **Authentication:** NextAuth/Auth.js with email magic link or credentials for MVP
- **Styling:** Tailwind CSS
- **Hosting target:** Vercel for app, Neon/Supabase/Postgres provider for database
- **Telemetry:** simple server-side and client-side event logging into Postgres initially

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
   |- Auth Layer
   |
   v
PostgreSQL
   |- users
   |- markets
   |- market_rules
   |- market_sources
   |- watchlist_items
   |- telemetry_events
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
The watchlist page shall list the user’s saved markets with:
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
- Input validation on all APIs
- Use parameterized queries via ORM only
- No secrets exposed to client
- Basic rate limiting is recommended for search and auth endpoints

## 10.4 Accessibility
- Keyboard-accessible search and result flow
- Sufficient color contrast
- Semantic headings and buttons
- Focus states on interactive controls
- External source links clearly labeled

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
  name           String?
  createdAt      DateTime        @default(now())
  updatedAt      DateTime        @updatedAt
  watchlistItems WatchlistItem[]
  telemetry      TelemetryEvent[]
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
  id          String   @id @default(cuid())
  marketId    String
  ruleKey     String
  label       String
  value       String
  details     String?
  displayOrder Int     @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  market      Market   @relation(fields: [marketId], references: [id], onDelete: Cascade)

  @@index([marketId, ruleKey])
}

model MarketSource {
  id          String   @id @default(cuid())
  marketId    String
  title       String
  url         String
  sourceType  String
  publisher   String?
  displayOrder Int     @default(0)
  createdAt   DateTime @default(now())

  market      Market   @relation(fields: [marketId], references: [id], onDelete: Cascade)

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
  "rules": [],
  "sources": []
}
```

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

## 14.4 DELETE /api/watchlist/:marketId
### Auth
Required

### Behavior
- remove item if exists
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
- at least one rule row
- at least one official source row

## 18.1 Seed File Structure
Claude should create seed files in a format such as:
- `prisma/seed.ts`
- `data/markets.ts`

Recommended approach:
- maintain a typed array in source control
- seed database from that typed array
- do not manually duplicate data in multiple files

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

## 23.1 Suggested Project Structure

```text
/app
  /(marketing)/page.tsx
  /market/[slug]/page.tsx
  /watchlist/page.tsx
  /api/search/route.ts
  /api/watchlist/route.ts
  /api/watchlist/[marketId]/route.ts
  /api/telemetry/route.ts
/components
  SearchBar.tsx
  ComplianceSummaryCard.tsx
  RuleCard.tsx
  SourceList.tsx
  FreshnessBadge.tsx
  WatchlistButton.tsx
/lib
  auth.ts
  db.ts
  market-search.ts
  telemetry.ts
  validations.ts
  formatters.ts
/prisma
  schema.prisma
  seed.ts
/data
  markets.ts
/types
  market.ts
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
- change-detection workflow
- notification system
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

1. Initialize app, database, Prisma, auth, Tailwind
2. Create schema and migrations
3. Add typed market seed data
4. Implement search normalization and matching
5. Build home page search
6. Build market result page
7. Build source links and freshness badges
8. Add watchlist APIs and UI
9. Add telemetry
10. Add tests and README polish

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
        details: "Home-sharing rules apply."
      },
      {
        ruleKey: "permit_required",
        label: "Permit Required",
        value: "Yes",
        details: "Registration or permit process required."
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

- [ ] Next.js app created
- [ ] TypeScript enabled
- [ ] Prisma schema complete
- [ ] PostgreSQL connected
- [ ] Seed script works
- [ ] Search flow works
- [ ] Supported result page complete
- [ ] Unsupported state complete
- [ ] Watchlist complete
- [ ] Telemetry logging complete
- [ ] Auth enforced for watchlist
- [ ] Basic tests added
- [ ] README added
- [ ] `.env.example` added
- [ ] No runtime AI dependency in core flow
