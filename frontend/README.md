# STR Comply — Frontend

Desktop-first short-term rental compliance lookup tool for LA-area markets.

**Production:** https://frontend-seven-plum-13.vercel.app

---

## Local Setup

### 1. Install dependencies

```bash
cd frontend
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

Fill in `.env.local` with your values:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Neon console → Connection string (pooler URL, append `&uselibpqcompat=true`) |
| `AUTH_SECRET` | `openssl rand -base64 32` |
| `AUTH_URL` | `http://localhost:3001` for local dev |
| `RESEND_KEY` | resend.com → API Keys |
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys |
| `COMPLIANCE_MONITOR_ENABLED` | `false` (leave off locally) |
| `COMPLIANCE_REPORT_EMAIL` | Your email address |
| `CRON_SECRET` | `openssl rand -hex 32` |

### 3. Start the dev server

```bash
npm run dev
```

Open http://localhost:3001.

---

## Key Commands

```bash
# Start dev server
npm run dev

# Build for production (also runs prisma generate)
npm run build

# Run tests
npm test

# Run tests in watch mode
npm run test:watch

# Run a database migration
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d'=' -f2-) npx prisma migrate dev --name <name>

# Re-seed the database
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d'=' -f2-) npx tsx prisma/seed.ts
```

---

## Project Structure

```
frontend/
  app/
    page.tsx                          — Home / search page
    market/[slug]/page.tsx            — Market result page
    watchlist/page.tsx                — Saved markets (auth-gated)
    login/page.tsx                    — Magic link login
    auth-error/page.tsx               — Auth error fallback
    unsupported/page.tsx              — Unsupported market state
    api/
      search/route.ts                 — GET /api/search?q=<query>
      markets/[slug]/route.ts         — GET /api/markets/:slug
      watchlist/route.ts              — GET + POST /api/watchlist
      watchlist/[marketSlug]/route.ts — DELETE /api/watchlist/:slug
      telemetry/route.ts              — POST /api/telemetry
      cron/compliance-monitor/route.ts — Vercel cron trigger
      admin/approve-source/route.ts   — HMAC-signed source approval
  lib/
    db.ts                             — Prisma client singleton
    session.ts                        — requireSession() auth guard
    normalize.ts                      — Search query normalization
    auth-adapter.ts                   — Custom NextAuth adapter (Prisma 7 compatible)
    approval-token.ts                 — HMAC sign/verify for source approval emails
    agents/
      compliance-monitor.ts           — Background compliance check agent
      source-discoverer.ts            — Source discovery agent
  prisma/
    schema.prisma                     — 11-table schema
    seed.ts                           — Seeds 5 LA-area markets
    migrations/                       — Migration history
  __tests__/
    unit/normalize-query.test.ts      — normalizeQuery pure function tests
    api/search.test.ts                — Search route handler tests (db mocked)
    api/watchlist.test.ts             — Watchlist GET/POST tests (db + session mocked)
  auth.ts                             — NextAuth v5 config (Resend magic link)
  prisma.config.ts                    — Prisma 7 adapter config
  vitest.config.ts                    — Test runner config
```

---

## Auth Flow

Authentication uses NextAuth v5 with Resend as the email provider (magic links).

1. User enters their email on `/login`
2. NextAuth sends a magic link via Resend to that email
3. Clicking the link completes sign-in and redirects to the app
4. All watchlist routes (`/api/watchlist`) require an active session

For local testing, `AUTH_URL=http://localhost:3001` must match the port your dev server runs on. Magic links will point to this URL.

---

## Supported Markets

Santa Monica · Los Angeles · West Hollywood · Pasadena · Malibu

---

## Compliance Monitor Agent

A background agent (`lib/agents/compliance-monitor.ts`) that checks for regulation changes on a weekly schedule. It is **off by default** — set `COMPLIANCE_MONITOR_ENABLED=true` to enable.

The Vercel cron schedule is defined in `vercel.json`. The agent uses a two-tier AI model strategy (Haiku pre-screen → Sonnet diff) to minimize cost.

---

## Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript |
| Styling | Tailwind CSS |
| Database | PostgreSQL via Neon, Prisma 7 ORM |
| Auth | NextAuth v5 + Resend (magic links) |
| AI | Anthropic SDK (compliance monitor only) |
| Hosting | Vercel |
| Tests | Vitest |
