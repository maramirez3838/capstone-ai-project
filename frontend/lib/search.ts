// Client-side search helpers — call the backend API.
// These are async because they make network requests.
//
// Server components (like app/market/[slug]/page.tsx) query the database
// directly via lib/db.ts instead of calling these functions.

import type { Market, SearchResponse } from '@/types/market'

export function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '') // strip punctuation
}

/**
 * Resolves a raw search query to a supported market or unsupported result.
 * Used by SearchBar (client component) to decide where to navigate.
 */
export async function resolveSearch(query: string): Promise<SearchResponse> {
  const res = await fetch(
    `/api/search?q=${encodeURIComponent(query)}`
  )

  if (!res.ok) {
    // Treat any error as unsupported rather than crashing the search flow
    return { type: 'unsupported', normalizedQuery: normalizeQuery(query) }
  }

  return res.json() as Promise<SearchResponse>
}

/**
 * Fetches a full market record by slug.
 * Used by client components that need market data after initial load.
 * Returns null if the market is not found.
 */
export async function getMarketBySlug(slug: string): Promise<Market | null> {
  const res = await fetch(`/api/markets/${encodeURIComponent(slug)}`)
  if (res.status === 404) return null
  if (!res.ok) return null
  return res.json() as Promise<Market>
}
