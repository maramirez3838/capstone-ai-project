# STR Comply

A desktop-first short-term rental compliance lookup tool for STR investors. Search any LA-area market and get a structured compliance summary, key rules, source links, and freshness indicators — all in one place.

**Production:** https://frontend-seven-plum-13.vercel.app

This is **not** a chat or AI answer product. Compliance summaries are pre-written, human-reviewed content, not generated at runtime.

---

## What it does

- Search a market by name to get its STR compliance status
- View permit requirements, owner-occupancy rules, and key regulations
- See source links with freshness indicators so you know how current the data is
- Save markets to a personal watchlist (requires sign-in via magic link)

---

## Project structure

```
/frontend              — Next.js app (App Router, TypeScript, Tailwind)
/backend               — Canonical market seed data
/Reference Artifacts   — Versioned PRD, SRD, and design system docs
CLAUDE.md              — Claude AI instructions for this project
lessons.md             — Running log of build decisions and lessons learned
```

---

## Running locally

See [`frontend/README.md`](frontend/README.md) for full setup instructions, including environment variables, database setup, and key commands.

**Quick start:**

```bash
cd frontend
npm install
cp .env.example .env.local   # fill in your values
npm run dev
```

Open http://localhost:3001.

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router), TypeScript, Tailwind CSS |
| Database | PostgreSQL via Neon, Prisma 7 ORM |
| Auth | NextAuth v5 + Resend (magic links) |
| AI | Anthropic SDK (background compliance monitor only) |
| Hosting | Vercel |
| Tests | Vitest |

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

Product and system requirements are versioned in `/Reference Artifacts`. Current versions are tracked in [`CLAUDE.md`](CLAUDE.md).

Always check `CLAUDE.md` for the latest file before reading any spec.
