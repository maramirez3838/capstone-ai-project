# STR Comply — Lessons Learned
# Stored at: ./docs/lessons.md (committed to git)
#
# PURPOSE: Every time Claude makes a mistake that gets corrected, a rule is added
# here to prevent recurrence. This file is imported by CLAUDE.md and grows over
# the life of the project.
#
# FORMAT: Add new rules at the top under the relevant section. Include the date
# and a one-line description of what went wrong before the rule.
#
# HOW TO ADD: After correcting Claude, say "log this to lessons.md" and Claude
# will add a rule in the correct format automatically.

---

## How to add a rule

```
### [YYYY-MM-DD] Short description of what went wrong
**Rule:** What Claude must do (or never do) to prevent this.
```

---

## UI and components

### [2026-04-13] Color-only status indicators fail WCAG AA for color-blind users
**Rule:** Every status badge (STR eligibility, rule value, freshness) must use a shape icon in addition to color. A colored dot alone is not sufficient — ~8% of male users have red-green color deficiency and cannot distinguish green from amber or red. Use checkmark (✓), warning triangle (⚠), and X circle (✕) SVG icons. Icons must be `aria-hidden="true" focusable="false"` since the text label carries the semantic meaning.

### [2026-04-13] `outline-none` on inputs must always be paired with a visible focus replacement
**Rule:** Never write `outline-none` or `focus:outline-none` on an interactive element without providing an equivalent visible focus indicator. For grouped inputs (e.g. icon + input + button inside a container div), apply `focus-within:ring-2 focus-within:border-{color}` to the container so keyboard focus is always visible. Sighted keyboard users are blocked entirely if no focus ring exists.

### [2026-04-13] `placeholder-gray-400` fails WCAG AA contrast (2.9:1 — minimum is 4.5:1)
**Rule:** Always use `placeholder-gray-500` (4.6:1 on white) or darker for placeholder text. `gray-400` (#9ca3af) on white fails AA for both normal and large text. This applies to all text inputs across the product.

### [2026-04-13] localStorage reads cause SSR hydration mismatches without a mounted guard
**Rule:** Any hook that reads `localStorage` must initialize with `mounted: false` and only read inside a `useEffect`. Components must render a loading skeleton (not `null`) until `mounted` is `true`. This prevents Next.js hydration errors where server-rendered HTML doesn't match the client state. See `lib/auth.ts` and `lib/watchlist.ts` for the correct pattern.

### [2026-04-12] `useSearchParams()` requires a `<Suspense>` boundary in App Router
**Rule:** Any page or component that calls `useSearchParams()` must be wrapped in a `<Suspense>` boundary, or Next.js will throw a build error. The correct pattern is to split the page into an inner content component (which calls `useSearchParams`) and an outer page component that wraps it in `<Suspense>`. See `app/unsupported/page.tsx` for the reference implementation.

---

## Data and mock fixtures

### [2026-04-13] Aliases rule updated — `MarketAlias` table IS in the DB schema (SRD v1.1)
**Rule:** Aliases do NOT belong as a flat column on the `Market` table. They belong in a separate `MarketAlias` join table (one row per alias, indexed on `alias`). This is what the SRD v1.1 specifies and is required for server-side search matching on `GET /api/search`. The FE `Market` type still carries `aliases: string[]` for display/mock purposes, but the backend stores them normalized in `MarketAlias`. The earlier rule ("aliases FE-only, never in DB") was written before the SRD finalized the search architecture and is now superseded.

---

## Search and routing

*(No rules logged yet.)*

---

## Backend and database

### [2026-04-17] `@auth/prisma-adapter` is incompatible with Prisma 7 + `@prisma/adapter-pg`
**Rule:** When using Prisma 7 with a driver adapter (`@prisma/adapter-pg`), model property accessors like `prisma.verificationToken` return `undefined`. `@auth/prisma-adapter` calls these at runtime and throws `Cannot read properties of undefined (reading 'create')`. The fix is a custom adapter in `lib/auth-adapter.ts` that uses `db.$queryRaw` / `db.$executeRaw` exclusively. Never use `@auth/prisma-adapter` with Prisma 7 + driver adapter.

### [2026-04-17] `channel_binding=require` in DATABASE_URL breaks the `pg` library
**Rule:** Neon sometimes provides connection strings with `channel_binding=require`. The `pg` npm package does not support this parameter and throws `ECONNREFUSED`. Always strip `&channel_binding=require` from `DATABASE_URL`. `sslmode=require` alone is sufficient and correct.

### [2026-04-17] `dotenv/config` does not load `.env.local` in `tsx` scripts
**Rule:** `import 'dotenv/config'` only loads `.env` — not `.env.local` (a Next.js convention). Use `configDotenv({ path: resolve(process.cwd(), '.env.local') })` instead. The config call must happen before any module that reads `process.env` is loaded — use dynamic `import()` for those modules after the dotenv call, otherwise imports are hoisted before the env vars are set.

### [2026-04-17] Neon pooler URL cannot be used for `prisma migrate dev`
**Rule:** Neon's pooler hostname (e.g. `ep-xxx-pooler.c-6.us-east-1.aws.neon.tech`) does not accept direct TCP connections required by Prisma migrations. Use the non-pooler hostname (remove `-pooler` from the hostname) for `prisma migrate dev`. The pooler URL is correct for runtime app queries.

### [2026-04-14] Prisma 7 removed `url` from schema.prisma datasource block
**Rule:** In Prisma 7, do NOT put `url = env("DATABASE_URL")` in `schema.prisma`. Connection config lives in `prisma.config.ts` (at the project root, next to `package.json`) using `defineConfig` with `datasource.url` and a `migrate.adapter`. Always use `@prisma/adapter-pg` + `pg` for PostgreSQL connections.

### [2026-04-14] Prisma 7 CLI does not auto-load `.env.local`
**Rule:** The Prisma CLI reads `.env` by default, not `.env.local` (which is a Next.js convention). When running `prisma migrate dev` or `npx tsx prisma/seed.ts`, always prefix with the env var:
```bash
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d'=' -f2-) npx prisma migrate dev --name <name>
DATABASE_URL=$(grep '^DATABASE_URL=' .env.local | cut -d'=' -f2-) npx tsx prisma/seed.ts
```
The dev server (`npm run dev`) reads `.env.local` automatically, so API routes work without this prefix.

### [2026-04-14] Prisma 7 seed command moved from package.json to prisma.config.ts
**Rule:** In Prisma 6, the seed command was `"prisma": { "seed": "tsx prisma/seed.ts" }` in `package.json`. In Prisma 7, `npx prisma db seed` reads from `prisma.config.ts`. Run the seed script directly instead: `npx tsx prisma/seed.ts` (with DATABASE_URL prefixed as above).

### [2026-04-14] Zod v4 renamed `.errors` to `.issues` on ZodError
**Rule:** In Zod v4, `parseResult.error.errors` does not exist. Use `parseResult.error.issues` instead. Also, `z.record()` now requires two arguments: `z.record(z.string(), z.unknown())` — the key schema is no longer optional.

---

## API shape and types

### [2026-04-13] `jurisdictionLevel` on `MarketRule` must remain optional in the DB schema
**Rule:** The `jurisdictionLevel` field (`city | county | state`) was added to `MarketRule` as optional (`String?` in Prisma). It must stay nullable in the database — not all rules will have a jurisdiction level, and adding a NOT NULL constraint would break existing seed data and any future markets where the level is unknown or genuinely mixed. The TypeScript type is `jurisdictionLevel?: 'city' | 'county' | 'state'`.

### [2026-04-12] `WatchlistEntry` has two different shapes — local hook vs. API contract
**Rule:** `types/market.ts` defines `WatchlistEntry` with a `marketSlug` field (the future API contract). `lib/watchlist.ts` uses a separate local interface with a `slug` field. TypeScript will not catch the mismatch because they are separate types. When wiring the BE, update the watchlist hook to consume the API shape (`marketSlug`) and delete the local interface.

---

## Styling and layout

### [2026-04-13] `text-orange-600` and `bg-orange-500` fail WCAG AA on small text
**Rule:** Orange-600 (#ea580c) on white achieves only 3.4:1 contrast — below the 4.5:1 AA minimum for small text. Orange-500 (#f97316) with white text on a button achieves ~2.7:1 — also a failure. Always use `text-orange-700` (#c2410c, 4.7:1 ✓) for orange text links and labels, and `bg-orange-700` as the minimum for orange buttons with white text. Apply the same logic to any other accent color used at small sizes.

---

## Git and file management

### [2026-04-12] `lessons.md` lives at the project root, not in `/docs/`
**Rule:** The file header and `CLAUDE_project.md` both reference `./docs/lessons.md`, but the file actually lives at `./lessons.md` (project root). No `/docs/` directory exists. Always write and reference the file at the project root. Update the header comment and `CLAUDE_project.md` reference to match reality before they mislead a new contributor.

### [2026-04-12] Next.js project does not use a `/src/` subdirectory
**Rule:** `CLAUDE_project.md` shows paths like `/frontend/src/app`, `/frontend/src/components`, etc. The actual project uses `/frontend/app`, `/frontend/components`, `/frontend/lib`, `/frontend/mocks`, `/frontend/types` directly. Do not create a `src/` layer. Update the project structure diagram in `CLAUDE_project.md` to match the real layout.

---

## Scope and over-building

*(No rules logged yet.)*
