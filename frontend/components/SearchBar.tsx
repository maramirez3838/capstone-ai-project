'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { resolveSearch, getMarketBySlug } from '@/lib/search'
import { logEvent } from '@/lib/telemetry'
import type { Market } from '@/types/market'

interface MapboxSearchBoxProps {
  accessToken: string
  value?: string
  onChange?: (value: string) => void
  onRetrieve?: (result: MapboxRetrieveResult) => void
  options?: { country?: string; types?: string }
  placeholder?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  theme?: Record<string, any>
}

interface MapboxRetrieveResult {
  features: Array<{
    properties: {
      full_address?: string
      place_formatted?: string
      name?: string
    }
  }>
}

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
  placeholder = 'Enter a city, address, or market name',
}: Props) {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [SearchBox, setSearchBox] = useState<React.ComponentType<MapboxSearchBoxProps> | null>(null)

  // Load Mapbox client-side only — the package registers customElements (browser API)
  // which throws during SSR on Vercel, causing the fallback input to render instead.
  useEffect(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@mapbox/search-js-react')
      setSearchBox(() => mod.SearchBox)
    } catch {
      // package unavailable — plain input fallback stays active
    }
  }, [])

  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const mapboxEnabled = Boolean(mapboxToken && SearchBox)

  async function handleSearchQuery(value: string) {
    const trimmed = value.trim()
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
          const market = await getMarketBySlug(result.market.slug)
          onSearch(market, trimmed)
        } else {
          router.push(`/market/${result.market.slug}`)
        }
      } else {
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

  async function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    await handleSearchQuery(query)
  }

  // When the user selects an address suggestion from Mapbox, auto-submit
  function handleMapboxRetrieve(result: MapboxRetrieveResult) {
    const feature = result.features[0]
    const address =
      feature?.properties?.full_address ??
      feature?.properties?.place_formatted ??
      feature?.properties?.name ??
      query
    setQuery(address)
    handleSearchQuery(address)
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

      <div className="flex items-center rounded-full border border-gray-200 shadow-md focus-within:shadow-lg focus-within:border-accent-500 focus-within:ring-2 focus-within:ring-accent-50 transition-all bg-white overflow-hidden">
        {/* Search icon — decorative, label carries the meaning */}
        <div className="pl-5 pr-3 flex-shrink-0 text-gray-400" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
          </svg>
        </div>

        {mapboxEnabled && SearchBox ? (
          // Mapbox address autofill — active when NEXT_PUBLIC_MAPBOX_TOKEN is set
          <div className="flex-1 py-1">
            <SearchBox
              accessToken={mapboxToken!}
              value={query}
              onChange={(val: string) => {
                setQuery(val)
                if (error) setError('')
              }}
              onRetrieve={handleMapboxRetrieve}
              options={{ country: 'us', types: 'address,place' }}
              placeholder={placeholder}
              theme={{
                variables: {
                  // Strip Mapbox's own container styling — our outer div handles it
                  boxShadow: 'none',
                  border: 'none',
                  borderRadius: '0',
                  fontFamily: 'inherit',
                  fontSize: '1rem',
                  colorBackground: 'transparent',
                },
              }}
            />
          </div>
        ) : (
          // Plain input — used when Mapbox token is not configured
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
        )}

        <div className="pr-2 flex-shrink-0">
          <button
            type="submit"
            disabled={isLoading}
            aria-busy={isLoading}
            className="px-6 py-2.5 bg-accent-500 text-white text-sm font-medium rounded-full hover:bg-accent-700 active:bg-accent-900 transition-colors whitespace-nowrap disabled:opacity-60"
          >
            {isLoading ? 'Searching…' : 'Look up'}
          </button>
        </div>
      </div>

      {/* Hint text — always in DOM, referenced by aria-describedby */}
      <p id="search-hint" className="mt-4 text-sm text-gray-400 pl-1">
        {mapboxEnabled
          ? 'Try a city, address, or market name — e.g. \u201c1234 Ocean Ave, Santa Monica\u201d'
          : 'Try a city or market name — e.g. \u201cSanta Monica\u201d or \u201cWest Hollywood\u201d'}
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
