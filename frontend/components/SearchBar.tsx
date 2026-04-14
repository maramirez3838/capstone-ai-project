'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { resolveSearch, getMarketBySlug } from '@/lib/search'
import { logEvent } from '@/lib/telemetry'
import type { Market } from '@/types/market'

interface Props {
  // When provided, results are returned inline instead of navigating.
  // The homepage uses this to display results on the same page.
  onSearch?: (market: Market | null, query: string) => void
  autoFocus?: boolean
  placeholder?: string
}

export default function SearchBar({
  onSearch,
  autoFocus = false,
  placeholder = 'Enter an address or city — try "Santa Monica" or "123 Main St, LA"',
}: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    const trimmed = query.trim()

    if (!trimmed) {
      setError('Enter a city, market, or property address.')
      return
    }

    setError('')
    setIsLoading(true)
    logEvent('search_performed', { queryText: trimmed })

    try {
      const result = await resolveSearch(trimmed)

      if (result.type === 'supported') {
        if (onSearch) {
          // Inline mode: fetch full market data, then pass to parent
          const market = await getMarketBySlug(result.market.slug)
          onSearch(market, trimmed)
        } else {
          router.push(`/market/${result.market.slug}`)
        }
      } else {
        // Unsupported market
        if (onSearch) {
          onSearch(null, trimmed)
        } else {
          router.push(`/unsupported?q=${encodeURIComponent(trimmed)}`)
        }
      }
    } catch {
      setError('Search is temporarily unavailable. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      role="search"
      aria-label="Market compliance lookup"
      className="w-full"
    >
      {/* Visually hidden label — placeholder alone is not sufficient for screen readers */}
      <label htmlFor="market-search" className="sr-only">
        Enter a city, market, or property address
      </label>

      <div className="flex items-center rounded-full border border-gray-200 shadow-md focus-within:shadow-lg focus-within:border-orange-400 focus-within:ring-2 focus-within:ring-orange-100 transition-all bg-white overflow-hidden">
        {/* Search icon — decorative, label carries the meaning */}
        <div className="pl-5 pr-3 flex-shrink-0 text-gray-400" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>

        <input
          id="market-search"
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (error) setError('')
          }}
          placeholder={placeholder}
          aria-describedby="search-hint search-error"
          aria-invalid={error ? 'true' : 'false'}
          aria-required="true"
          autoComplete="off"
          spellCheck={false}
          autoFocus={autoFocus}
          disabled={isLoading}
          className="flex-1 py-4 text-base text-gray-900 placeholder-gray-500 bg-transparent focus:outline-none disabled:opacity-60"
        />

        <div className="pr-2 flex-shrink-0">
          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className="px-6 py-2.5 bg-orange-700 text-white text-sm font-semibold rounded-full hover:bg-orange-800 active:bg-orange-900 transition-colors whitespace-nowrap disabled:opacity-60"
          >
            {isLoading ? 'Searching…' : 'Look up'}
          </button>
        </div>
      </div>

      {/* Hint text — always in DOM, referenced by aria-describedby */}
      <p id="search-hint" className="mt-4 text-sm text-gray-400 pl-1">
        Try a city name, market, or full property address — e.g. &ldquo;Santa Monica&rdquo; or &ldquo;123 Main St, Los Angeles&rdquo;
      </p>

      {/* Error — always in DOM, empty when no error; role="alert" announces immediately */}
      <p
        id="search-error"
        role="alert"
        aria-live="assertive"
        className="mt-3 text-sm text-red-500 pl-5"
      >
        {error}
      </p>
    </form>
  )
}
