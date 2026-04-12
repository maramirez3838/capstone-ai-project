'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useWatchlist } from '@/lib/watchlist'
import { getMarketBySlug } from '@/lib/search'
import StatusBadge from '@/components/StatusBadge'
import FreshnessBadge from '@/components/FreshnessBadge'
import { formatPermitRequired, formatOwnerOccupancy, formatLastReviewed } from '@/lib/formatters'

export default function WatchlistPage() {
  const router = useRouter()
  const { isSignedIn, mounted: authMounted } = useAuth()
  const { entries, remove, mounted: watchlistMounted } = useWatchlist()

  useEffect(() => {
    if (authMounted && !isSignedIn) {
      router.replace('/login?returnTo=/watchlist')
    }
  }, [authMounted, isSignedIn, router])

  if (!authMounted || !watchlistMounted) {
    return (
      <div className="max-w-4xl mx-auto px-6 py-16 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-gray-900 animate-pulse" />
        ))}
      </div>
    )
  }

  if (!isSignedIn) return null

  const savedMarkets = entries
    .map((entry) => {
      const market = getMarketBySlug(entry.slug)
      return market ? { market, savedAt: entry.savedAt } : null
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Your Watchlist</h1>
          <p className="text-sm text-gray-500 mt-1">
            {savedMarkets.length} of 25 markets saved
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          + Add market
        </Link>
      </div>

      {/* Empty state */}
      {savedMarkets.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 px-8 py-16 text-center">
          <p className="text-gray-400 text-base mb-1">No markets saved yet.</p>
          <p className="text-sm text-gray-600 mb-6">
            Search for a market and click &quot;Save to Watchlist&quot; to track it here.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Search markets
          </Link>
        </div>
      )}

      {/* Watchlist table */}
      {savedMarkets.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-800/50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Market
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  STR Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hidden md:table-cell">
                  Permit
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hidden md:table-cell">
                  Owner-Occupied
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hidden lg:table-cell">
                  Freshness
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 hidden lg:table-cell">
                  Saved
                </th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {savedMarkets.map(({ market, savedAt }) => (
                <tr key={market.slug} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <Link
                      href={`/market/${market.slug}`}
                      className="font-semibold text-gray-200 hover:text-indigo-400 transition-colors"
                    >
                      {market.name}
                    </Link>
                    <p className="text-xs text-gray-600 mt-0.5">{market.countyName}</p>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={market.strStatus} size="sm" />
                  </td>
                  <td className="px-4 py-4 text-gray-400 hidden md:table-cell">
                    {formatPermitRequired(market.permitRequired)}
                  </td>
                  <td className="px-4 py-4 text-gray-400 hidden md:table-cell">
                    {formatOwnerOccupancy(market.ownerOccupancyRequired)}
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <FreshnessBadge
                      status={market.freshnessStatus}
                      lastReviewedAt={market.lastReviewedAt}
                    />
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-600 hidden lg:table-cell whitespace-nowrap">
                    {formatLastReviewed(savedAt)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => remove(market.slug)}
                      className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
