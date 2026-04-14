'use client'

// Watchlist hook — fetches from and writes to the real API.
// All routes require auth. Until NextAuth is wired in, the API returns
// 401 and the hook gracefully shows an empty watchlist.
// When auth is added, this file does not need to change.

import { useState, useEffect, useCallback } from 'react'
import { logEvent } from './telemetry'

const MAX_ITEMS = 25

export interface WatchlistEntry {
  marketSlug: string
  savedAt: string // ISO 8601
  market: {
    name: string
    strStatus: string
    countyName: string | null
    freshnessStatus: string
    permitRequired: string
    ownerOccupancyRequired: string
    lastReviewedAt: string
  }
}

export function useWatchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([])
  const [mounted, setMounted] = useState(false)

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch('/api/watchlist')
      if (res.status === 401) {
        // Not authenticated — empty watchlist is the correct state
        setEntries([])
        return
      }
      if (!res.ok) {
        setEntries([])
        return
      }
      const data: WatchlistEntry[] = await res.json()
      setEntries(data)
    } catch {
      setEntries([])
    }
  }, [])

  useEffect(() => {
    setMounted(true)
    fetchWatchlist()
  }, [fetchWatchlist])

  async function save(slug: string) {
    if (entries.some((e) => e.marketSlug === slug)) return
    if (entries.length >= MAX_ITEMS) return

    try {
      const res = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ marketSlug: slug }),
      })
      if (res.ok) {
        logEvent('market_saved', { marketSlug: slug })
        // Re-fetch to get the server-authoritative list with embedded market data
        await fetchWatchlist()
      }
    } catch {
      // Save silently fails — user can retry
    }
  }

  async function remove(slug: string) {
    try {
      const res = await fetch(`/api/watchlist/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        logEvent('market_removed', { marketSlug: slug })
        // Optimistically update — remove from local state immediately
        setEntries((prev) => prev.filter((e) => e.marketSlug !== slug))
      }
    } catch {
      // Remove silently fails — user can retry
    }
  }

  function isSaved(slug: string): boolean {
    return entries.some((e) => e.marketSlug === slug)
  }

  const isAtLimit = entries.length >= MAX_ITEMS

  return { entries, save, remove, isSaved, isAtLimit, mounted }
}
