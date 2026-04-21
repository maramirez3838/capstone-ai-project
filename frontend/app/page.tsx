'use client'

import { useState } from 'react'
import type { Market } from '@/types/market'
import SearchBar from '@/components/SearchBar'
import ComplianceSummaryCard from '@/components/ComplianceSummaryCard'
import RuleCard from '@/components/RuleCard'
import { logEvent } from '@/lib/telemetry'
import SourceList from '@/components/SourceList'
import FreshnessBadge from '@/components/FreshnessBadge'
import WatchlistButton from '@/components/WatchlistButton'
import Disclaimer from '@/components/Disclaimer'

type SearchState =
  | { status: 'idle' }
  | { status: 'found'; market: Market }
  | { status: 'not_found'; query: string }

export default function HomePage() {
  const [state, setState] = useState<SearchState>({ status: 'idle' })

  function handleSearch(market: Market | null, query: string) {
    if (market) {
      setState({ status: 'found', market })
    } else {
      setState({ status: 'not_found', query })
      logEvent('unsupported_market_seen', { queryText: query })
    }
    // Scroll to results smoothly
    setTimeout(() => {
      document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }

  const hasResults = state.status !== 'idle'

  return (
    <div>
      {/* Hero */}
      <div className={`transition-all duration-300 ${hasResults ? 'pt-10 pb-8' : 'pt-24 pb-20'}`}>
        <div className="max-w-3xl mx-auto px-6">
          {!hasResults && (
            <>
              <h1 className="text-5xl font-medium text-gray-900 tracking-tight mb-4 leading-tight">
                Is this property<br />legally rentable?
              </h1>
              <p className="text-xl text-gray-500 mb-10">
                Jurisdiction-specific STR compliance in under 60 seconds.
              </p>
            </>
          )}
          <SearchBar onSearch={handleSearch} autoFocus={!hasResults} />
        </div>
      </div>

      {/* Results */}
      {state.status === 'found' && (
        <div id="results" className="max-w-4xl mx-auto px-6 pb-20">
          <div className="border-t border-gray-100 pt-8">
            {/* Market header */}
            <div className="mb-6">
              <p className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-1">
                Result for your search
              </p>
              <h2 className="text-2xl font-medium text-gray-900 tracking-tight">
                {state.market.name}
              </h2>
              <p className="text-gray-500 mt-0.5 text-sm">
                {state.market.countyName}
                {state.market.regionLabel && <span> · {state.market.regionLabel}</span>}
                {' '}· {state.market.stateCode}
              </p>
            </div>

            {/* Compliance summary */}
            <ComplianceSummaryCard market={state.market} />

            {/* Rule breakdown */}
            {state.market.rules.length > 0 && (
              <div className="mt-10">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-medium text-gray-900">Rule Breakdown</h3>
                  <span className="text-xs text-gray-400">
                    {state.market.rules.length} rule{state.market.rules.length !== 1 ? 's' : ''} · source-linked
                  </span>
                </div>
                <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 overflow-hidden">
                  {[...state.market.rules]
                    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
                    .map((rule) => (
                      <RuleCard key={rule.ruleKey} rule={rule} lastReviewedAt={state.market.lastReviewedAt} allSources={state.market.sources} />
                    ))}
                </div>
              </div>
            )}

            {/* Sources */}
            <div className="mt-10">
              <h3 className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">
                Source Documents
              </h3>
              <SourceList
                sources={[...state.market.sources].sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))}
                marketSlug={state.market.slug}
              />
            </div>

            {/* Freshness */}
            <div className="mt-6">
              <FreshnessBadge status={state.market.freshnessStatus} lastReviewedAt={state.market.lastReviewedAt} />
              {state.market.freshnessStatus === 'needs_review' && (
                <p className="mt-3 text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3">
                  This summary is overdue for verification. Do not rely on it for active
                  underwriting — check the source documents above before making any decisions.
                </p>
              )}
            </div>

            {/* Watchlist */}
            <div className="mt-6">
              <WatchlistButton marketSlug={state.market.slug} marketName={state.market.name} />
            </div>

            {/* Disclaimer */}
            <div className="mt-10 pt-8 border-t border-gray-100">
              <Disclaimer />
            </div>
          </div>
        </div>
      )}

      {/* Not found */}
      {state.status === 'not_found' && (
        <div id="results" className="max-w-3xl mx-auto px-6 pb-20">
          <div className="border-t border-gray-100 pt-8">
            <div className="rounded-2xl border border-gray-100 bg-gray-50 px-8 py-10 text-center">
              <p className="text-2xl mb-2">🔍</p>
              <h3 className="text-base font-medium text-gray-900 mb-1">
                No results for &ldquo;{state.query}&rdquo;
              </h3>
              <p className="text-sm text-gray-500">
                This market isn&apos;t in our database yet. We currently cover select LA-area markets.
              </p>
              <p className="text-sm text-gray-400 mt-3">
                Try: Santa Monica, Los Angeles, Malibu, West Hollywood, or Pasadena
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
