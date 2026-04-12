// Deterministic search logic — no fuzzy matching, no AI.
// Priority order per spec:
//   1. Exact slug match
//   2. Exact alias match
//   3. Normalized exact name match
//   4. Normalized partial contains match
//   5. Unsupported fallback (return null)

import { markets } from '@/mocks/markets'
import type { Market } from '@/types/market'

export function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '') // strip punctuation
}

export function resolveSearch(query: string): Market | null {
  const q = normalizeQuery(query)
  if (!q) return null

  // 1. Exact slug match
  const bySlug = markets.find((m) => m.slug === q)
  if (bySlug) return bySlug

  // 2. Exact alias match
  const byAlias = markets.find((m) =>
    m.aliases.some((a) => normalizeQuery(a) === q)
  )
  if (byAlias) return byAlias

  // 3. Normalized exact name match
  const byName = markets.find((m) => normalizeQuery(m.name) === q)
  if (byName) return byName

  // 4. Partial contains match — query contains market name or vice versa
  const byPartial = markets.find(
    (m) =>
      normalizeQuery(m.name).includes(q) ||
      q.includes(normalizeQuery(m.name)) ||
      m.aliases.some(
        (a) => normalizeQuery(a).includes(q) || q.includes(normalizeQuery(a))
      )
  )
  if (byPartial) return byPartial

  return null
}

export function getMarketBySlug(slug: string): Market | null {
  return markets.find((m) => m.slug === slug) ?? null
}

export function getAllMarkets(): Market[] {
  return markets
}
