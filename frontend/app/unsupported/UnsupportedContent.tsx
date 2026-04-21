'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import SearchBar from '@/components/SearchBar'
import StatusBadge from '@/components/StatusBadge'
import { logEvent } from '@/lib/telemetry'
import type { StrStatus } from '@/types/market'

interface MarketSummary {
  slug: string
  name: string
  countyName: string | null
  strStatus: string
}

interface Props {
  markets: MarketSummary[]
}

export default function UnsupportedContent({ markets }: Props) {
  const searchParams = useSearchParams()
  const query = searchParams.get('q') ?? ''

  useEffect(() => {
    logEvent('unsupported_market_seen', { queryText: query })
  }, [query])

  return (
    <div className="min-h-screen bg-gray-950">
    <div className="max-w-2xl mx-auto px-6 py-16">
      {/* Message */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gray-800 text-2xl mb-5">
          🗺
        </div>
        <h1 className="text-2xl font-medium text-gray-100 mb-3">
          {query ? (
            <>&ldquo;{query}&rdquo; isn&apos;t covered yet.</>
          ) : (
            'Market not found.'
          )}
        </h1>
        <p className="text-gray-400 text-base max-w-md mx-auto leading-relaxed">
          STR Comply currently covers a focused set of LA-area markets. We
          can&apos;t confidently return a compliance summary for this jurisdiction —
          don&apos;t rely on an unsupported result for underwriting.
        </p>
      </div>

      {/* Search again */}
      <div className="mb-12">
        <p className="text-sm font-medium text-gray-500 mb-3 text-center">
          Browse covered markets:
        </p>
        <SearchBar />
      </div>

      {/* Supported markets */}
      <div>
        <p className="text-xs font-medium uppercase tracking-widest text-gray-600 mb-4">
          Supported markets
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {markets.map((m) => (
            <Link
              key={m.slug}
              href={`/market/${m.slug}`}
              className="group flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 hover:border-accent-500 hover:bg-gray-800/60 transition-all"
            >
              <div>
                <p className="text-sm font-medium text-gray-200 group-hover:text-accent-50 transition-colors">
                  {m.name}
                </p>
                {m.countyName && (
                  <p className="text-xs text-gray-500 mt-0.5">{m.countyName}</p>
                )}
              </div>
              <StatusBadge status={m.strStatus as StrStatus} size="sm" />
            </Link>
          ))}
        </div>
      </div>
    </div>
    </div>
  )
}
