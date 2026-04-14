'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useWatchlist } from '@/lib/watchlist'
import StatusBadge from '@/components/StatusBadge'
import FreshnessBadge from '@/components/FreshnessBadge'
import { formatPermitRequired, formatOwnerOccupancy, formatLastReviewed } from '@/lib/formatters'
import type { StrStatus, PermitRequired, OwnerOccupancy, FreshnessStatus } from '@/types/market'

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

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-100">My Markets</h1>
          <p className="text-sm text-gray-500 mt-1">
            {entries.length} of 25 markets tracked
          </p>
        </div>
        <Link
          href="/"
          className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
        >
          + Track a market
        </Link>
      </div>

      {/* Empty state */}
      {entries.length === 0 && (
        <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 px-8 py-16 text-center">
          <p className="text-gray-400 text-base mb-1">No markets tracked yet.</p>
          <p className="text-sm text-gray-600 mb-6">
            Search for a market and click &quot;Track this Market&quot; to add it to your pipeline.
          </p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors"
          >
            Find a market
          </Link>
        </div>
      )}

      {/* Watchlist table */}
      {entries.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800 bg-gray-800/50">
                <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  Market
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  STR Eligibility
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
              {entries.map(({ marketSlug, savedAt, market }) => (
                <tr key={marketSlug} className="hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-4">
                    <Link
                      href={`/market/${marketSlug}`}
                      className="font-semibold text-gray-200 hover:text-indigo-400 transition-colors"
                    >
                      {market.name}
                    </Link>
                    {market.countyName && (
                      <p className="text-xs text-gray-600 mt-0.5">{market.countyName}</p>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge status={market.strStatus as StrStatus} size="sm" />
                  </td>
                  <td className="px-4 py-4 text-gray-400 hidden md:table-cell">
                    {formatPermitRequired(market.permitRequired as PermitRequired)}
                  </td>
                  <td className="px-4 py-4 text-gray-400 hidden md:table-cell">
                    {formatOwnerOccupancy(market.ownerOccupancyRequired as OwnerOccupancy)}
                  </td>
                  <td className="px-4 py-4 hidden lg:table-cell">
                    <FreshnessBadge
                      status={market.freshnessStatus as FreshnessStatus}
                      lastReviewedAt={market.lastReviewedAt}
                    />
                  </td>
                  <td className="px-4 py-4 text-xs text-gray-600 hidden lg:table-cell whitespace-nowrap">
                    {formatLastReviewed(savedAt)}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <button
                      onClick={() => remove(marketSlug)}
                      aria-label={`Remove ${market.name} from watchlist`}
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
