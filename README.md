# STR Comply

A desktop-first short-term rental compliance lookup tool for STR investors. Search any LA-area market and get a structured compliance summary, key rules, source links, and freshness indicators — all in one place.

This is **not** a chat or AI answer product. Compliance summaries are pre-written, human-reviewed content, not generated at runtime.

---

## What it does

- Search a market by name to get its STR compliance status
- View permit requirements, owner-occupancy rules, and key regulations
- See source links with freshness indicators so you know how current the data is
- Save markets to a personal watchlist for quick reference

---

## Project structure

```
/frontend              — Next.js frontend (current build phase)
/backend               — Backend API and database (coming when BE engineer joins)
/Reference Artifacts   — Versioned PRD and SRD docs
CLAUDE.md              — Claude AI instructions for this project
lessons.md             — Running log of build decisions and lessons learned
```

---

## Current phase: UI-first

The frontend is being built before the backend exists. All data comes from static mock files — no database or API calls yet.

See [`frontend/README.md`](frontend/README.md) for setup instructions and a full breakdown of the frontend structure.

**To run the app locally:**

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Backend (planned) | Next.js API routes, PostgreSQL, Prisma ORM |
| Auth (planned) | NextAuth / Auth.js — email magic link |
| Hosting (planned) | Vercel (app) + Neon or Supabase (database) |

---

## Team workflow

- `main` is protected — no direct pushes
- All work happens on a feature branch
- Open a PR to merge into `main`; get at least one review before merging
- Never commit `.env` or `.env.local`
- Update `frontend/.env.example` whenever you add a new environment variable

**Branch naming:**
```
feat/short-description    — new feature
fix/short-description     — bug fix
chore/short-description   — non-feature work (config, deps, docs)
```

---

## Reference artifacts

Product and system requirements are versioned in `/Reference Artifacts`. The current versions are tracked in [`CLAUDE.md`](CLAUDE.md).

Always check `CLAUDE.md` for the latest file before reading any spec — do not read older versions.

---

## Environment variables

Copy `frontend/.env.example` to `frontend/.env.local` and fill in values before running locally. The example file documents every variable the app expects.
