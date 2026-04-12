'use client'

// Watchlist state backed by localStorage during UI phase.
// When BE joins, replace persist/read calls with POST/DELETE /api/watchlist.

import { useState, useEffect } from 'react'
import { logEvent } from './telemetry'

const STORAGE_KEY = 'str_comply_watchlist'
const MAX_ITEMS = 25

interface WatchlistEntry {
  slug: string
  savedAt: string // ISO 8601
}

export function useWatchlist() {
  const [entries, setEntries] = useState<WatchlistEntry[]>([])
  const [mounted, setMounted] = useState(false)

  // Read from localStorage after mount to avoid SSR hydration mismatch
  useEffect(() => {
    setMounted(true)
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      setEntries(raw ? JSON.parse(raw) : [])
    } catch {
      setEntries([])
    }
  }, [])

  function persist(updated: WatchlistEntry[]) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated))
    setEntries(updated)
  }

  function save(slug: string) {
    if (entries.some((e) => e.slug === slug)) return
    if (entries.length >= MAX_ITEMS) return
    const updated = [...entries, { slug, savedAt: new Date().toISOString() }]
    persist(updated)
    logEvent('market_saved', { marketSlug: slug })
  }

  function remove(slug: string) {
    const updated = entries.filter((e) => e.slug !== slug)
    persist(updated)
    logEvent('market_removed', { marketSlug: slug })
  }

  function isSaved(slug: string): boolean {
    return entries.some((e) => e.slug === slug)
  }

  const isAtLimit = entries.length >= MAX_ITEMS

  return { entries, save, remove, isSaved, isAtLimit, mounted }
}
