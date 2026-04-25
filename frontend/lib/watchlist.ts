'use client'

// Watchlist hook — fetches from and writes to /api/watchlist.
// Polymorphic: tracks both saved markets and saved properties as independent
// lists with independent 25-item limits. The mounted flag follows the
// SSR-safe pattern (lessons.md 2026-04-13) so consumers can avoid hydration
// mismatches by rendering a skeleton until mounted === true.

import { useState, useEffect, useCallback } from 'react'
import { logEvent } from './telemetry'
import type { WatchlistMarketEntry, WatchlistPropertyEntry, WatchlistResponse } from '@/types/market'

const MAX_PER_KIND = 25

export function useWatchlist() {
  const [markets, setMarkets] = useState<WatchlistMarketEntry[]>([])
  const [properties, setProperties] = useState<WatchlistPropertyEntry[]>([])
  const [mounted, setMounted] = useState(false)

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch('/api/watchlist')
      if (!res.ok) {
        setMarkets([])
        setProperties([])
        return
      }
      const data: WatchlistResponse = await res.json()
      setMarkets(data.markets)
      setProperties(data.properties)
    } catch {
      setMarkets([])
      setProperties([])
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    fetchWatchlist()
  }, [fetchWatchlist])

  // ── Market actions ──────────────────────────────────────────────────────
  async function saveMarket(slug: string) {
    if (markets.some((e) => e.marketSlug === slug)) return
    if (markets.length >= MAX_PER_KIND) return

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketSlug: slug }),
      })
      if (res.ok) {
        logEvent('market_saved', { marketSlug: slug })
        await fetchWatchlist()
      }
    } catch {
      // Silent failure — user can retry
    }
  }

  async function removeMarket(slug: string) {
    try {
      const res = await fetch(`/api/watchlist/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        logEvent('market_removed', { marketSlug: slug })
        setMarkets((prev) => prev.filter((e) => e.marketSlug !== slug))
      }
    } catch {
      // Silent failure — user can retry
    }
  }

  // ── Property actions ────────────────────────────────────────────────────
  async function saveProperty(address: string) {
    if (properties.some((e) => e.address === address)) return
    if (properties.length >= MAX_PER_KIND) return

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ propertyAddress: address }),
      })
      if (res.ok) {
        logEvent('property_saved', { metadata: { address } })
        await fetchWatchlist()
      }
    } catch {
      // Silent failure — user can retry
    }
  }

  async function removeProperty(propertyId: string) {
    try {
      const res = await fetch(`/api/watchlist/property/${encodeURIComponent(propertyId)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        logEvent('property_removed', { metadata: { propertyId } })
        setProperties((prev) => prev.filter((e) => e.propertyId !== propertyId))
      }
    } catch {
      // Silent failure — user can retry
    }
  }

  function isSavedMarket(slug: string): boolean {
    return markets.some((e) => e.marketSlug === slug)
  }

  function isSavedProperty(address: string): boolean {
    return properties.some((e) => e.address === address)
  }

  const isAtMarketLimit = markets.length >= MAX_PER_KIND
  const isAtPropertyLimit = properties.length >= MAX_PER_KIND

  return {
    markets,
    properties,
    saveMarket,
    removeMarket,
    saveProperty,
    removeProperty,
    isSavedMarket,
    isSavedProperty,
    isAtMarketLimit,
    isAtPropertyLimit,
    mounted,
  }
}
