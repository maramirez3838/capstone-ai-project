'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect } from 'react'
import SearchBar from '@/components/SearchBar'
import StatusBadge from '@/components/StatusBadge'
import { getAllMarkets } from '@/lib/search'
import { logEvent } from '@/lib/telemetry'

function UnsupportedContent() {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') ?? ''
  const markets = getAllMarkets()

  useEffect(() => {
    logEvent('unsupported_market_seen', { queryText: query })
  }, [query])

  return (
    <div className="max-w-2xl mx-auto px-6 py-16">
      {/* Message */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-800 text-2xl mb-5">
          🗺
        </div>
        <h1 className="text-2xl font-bold text-gray-100 mb-3">
          {query ? (
            <>&ldquo;{query}&rdquo; isn&apos;t covered yet.</>
          ) : (
            'Market not found.'
          )}
        </h1>
        <p className="text-gray-400 text-base max-w-md mx-auto leading-relaxed">
          STR Comply currently covers a limited set of LA-area markets for the
          MVP. We can&apos;t confidently map your search to a supported jurisdiction.
        </p>
      </div>

      {/* Search again */}
      <div className="mb-12">
        <p className="text-sm font-medium text-gray-500 mb-3 text-center">
          Try a supported market:
        </p>
        <SearchBar />
      </div>

      {/* Supported markets */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">
          Supported markets
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {markets.map((m) => (
            <Link
              key={m.slug}
              href={`/market/${m.slug}`}
              className="group flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 hover:border-indigo-700 hover:bg-gray-800/60 transition-all"
            >
              <div>
                <p className="text-sm font-semibold text-gray-200 group-hover:text-indigo-300 transition-colors">
                  {m.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{m.countyName}</p>
              </div>
              <StatusBadge status={m.strStatus} size="sm" />
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function UnsupportedPage() {
  return (
    <Suspense fallback={<div className="max-w-2xl mx-auto px-6 py-16" />}>
      <UnsupportedContent />
    </Suspense>
  )
}
