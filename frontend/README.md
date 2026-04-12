# STR Comply — Frontend

Desktop-first short-term rental compliance lookup tool for LA-area markets.

## Quick Start

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## What's here

This is the **UI-first phase** — all data comes from static mock files. No database or backend required.

| Path | What it does |
|------|-------------|
| `app/page.tsx` | Home / search page |
| `app/market/[slug]/page.tsx` | Market result page |
| `app/watchlist/page.tsx` | Saved markets (mock auth-gated) |
| `app/login/page.tsx` | Login stub (any email works) |
| `app/unsupported/page.tsx` | Unsupported market state |
| `mocks/markets.ts` | Static market data (5 LA-area markets) |
| `types/market.ts` | TypeScript interfaces — the API contract for BE |
| `lib/search.ts` | Deterministic search matching |
| `lib/auth.ts` | Mock auth backed by localStorage |
| `lib/watchlist.ts` | Watchlist state backed by localStorage |

## Supported markets

Santa Monica · Los Angeles · West Hollywood · Pasadena · Malibu

## Auth

Auth is mocked — sign in with any email address. State is stored in `localStorage`.

## Watchlist

Watchlist is stored in `localStorage`. No server calls. Max 25 markets.

## When backend joins

1. Replace `lib/auth.ts` with NextAuth session hooks
2. Replace `lib/watchlist.ts` with `POST/DELETE /api/watchlist` calls
3. Replace `lib/telemetry.ts` stubs with `POST /api/telemetry`
4. The types in `types/market.ts` define the exact API contract shape

## Stack

- Next.js 15 (App Router) · TypeScript · Tailwind CSS
- No component libraries — utility classes only
