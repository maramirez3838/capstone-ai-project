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

### [2026-04-12] localStorage reads cause SSR hydration mismatches without a mounted guard
**Rule:** Any hook that reads `localStorage` must initialize with `mounted: false` and only read inside a `useEffect`. Components must render a loading skeleton (not `null`) until `mounted` is `true`. This prevents Next.js hydration errors where server-rendered HTML doesn't match the client state. See `lib/auth.ts` and `lib/watchlist.ts` for the correct pattern.

### [2026-04-12] `useSearchParams()` requires a `<Suspense>` boundary in App Router
**Rule:** Any page or component that calls `useSearchParams()` must be wrapped in a `<Suspense>` boundary, or Next.js will throw a build error. The correct pattern is to split the page into an inner content component (which calls `useSearchParams`) and an outer page component that wraps it in `<Suspense>`. See `app/unsupported/page.tsx` for the reference implementation.

---

## Data and mock fixtures

### [2026-04-12] `aliases` field is FE-only — do not add to the BE Market table
**Rule:** The `aliases` field on the `Market` interface is used only for client-side search matching and is explicitly not part of the backend data model (see comment in `types/market.ts`). When BE builds the schema, do not add an `aliases` column to the Market table. If aliases are needed later, they belong in a separate lookup/join table.

---

## Search and routing

*(No rules logged yet.)*

---

## API shape and types

### [2026-04-12] `WatchlistEntry` has two different shapes — local hook vs. API contract
**Rule:** `types/market.ts` defines `WatchlistEntry` with a `marketSlug` field (the future API contract). `lib/watchlist.ts` uses a separate local interface with a `slug` field. TypeScript will not catch the mismatch because they are separate types. When wiring the BE, update the watchlist hook to consume the API shape (`marketSlug`) and delete the local interface.

---

## Styling and layout

*(No rules logged yet.)*

---

## Git and file management

### [2026-04-12] `lessons.md` lives at the project root, not in `/docs/`
**Rule:** The file header and `CLAUDE_project.md` both reference `./docs/lessons.md`, but the file actually lives at `./lessons.md` (project root). No `/docs/` directory exists. Always write and reference the file at the project root. Update the header comment and `CLAUDE_project.md` reference to match reality before they mislead a new contributor.

### [2026-04-12] Next.js project does not use a `/src/` subdirectory
**Rule:** `CLAUDE_project.md` shows paths like `/frontend/src/app`, `/frontend/src/components`, etc. The actual project uses `/frontend/app`, `/frontend/components`, `/frontend/lib`, `/frontend/mocks`, `/frontend/types` directly. Do not create a `src/` layer. Update the project structure diagram in `CLAUDE_project.md` to match the real layout.

---

## Scope and over-building

*(No rules logged yet.)*
