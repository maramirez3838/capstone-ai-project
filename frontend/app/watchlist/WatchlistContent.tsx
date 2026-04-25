'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect } from 'react'
import { useAuth } from '@/lib/auth'
import { useWatchlist } from '@/lib/watchlist'
import StatusBadge from '@/components/StatusBadge'
import FreshnessBadge from '@/components/FreshnessBadge'
import {
  formatPermitRequired,
  formatOwnerOccupancy,
  formatLastReviewed,
} from '@/lib/formatters'
import type {
  StrStatus,
  PermitRequired,
  OwnerOccupancy,
  FreshnessStatus,
  WatchlistPropertyEntry,
} from '@/types/market'
import { buildPropertyHref } from '@/lib/property-urls'

type Tab = 'markets' | 'properties'

export default function WatchlistContent() {
  const router = useRouter()
  const params = useSearchParams()
  const tab: Tab = params.get('tab') === 'properties' ? 'properties' : 'markets'

  const { isSignedIn, mounted: authMounted } = useAuth()
  const {
    markets,
    properties,
    removeMarket,
    removeProperty,
    mounted: watchlistMounted,
  } = useWatchlist()

  useEffect(() => {
    if (authMounted && !isSignedIn) {
      router.replace('/login?returnTo=/watchlist')
    }
  }, [authMounted, isSignedIn, router])

  if (!authMounted || !watchlistMounted) {
    return (
      <div className="min-h-screen bg-gray-950">
        <div className="max-w-4xl mx-auto px-6 py-16 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 rounded-lg bg-gray-800 animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!isSignedIn) return null

  const totalMarkets = markets.length
  const totalProperties = properties.length

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-medium text-gray-100">Watchlist</h1>
            <p className="text-sm text-gray-500 mt-1">
              {tab === 'markets'
                ? `${totalMarkets} of 25 markets tracked`
                : `${totalProperties} of 25 properties tracked`}
            </p>
          </div>
          <Link
            href="/"
            className="text-sm font-medium text-accent-500 hover:text-accent-700 transition-colors"
          >
            + Find more
          </Link>
        </div>

        {/* Tabs */}
        <div
          role="tablist"
          aria-label="Watchlist sections"
          className="mb-6 inline-flex rounded-lg border border-gray-800 bg-gray-900 p-1"
        >
          <TabButton
            label="Markets"
            count={totalMarkets}
            active={tab === 'markets'}
            href="/watchlist"
          />
          <TabButton
            label="Properties"
            count={totalProperties}
            active={tab === 'properties'}
            href="/watchlist?tab=properties"
          />
        </div>

        {tab === 'markets' ? (
          <MarketsPanel markets={markets} onRemove={removeMarket} />
        ) : (
          <PropertiesPanel properties={properties} onRemove={removeProperty} />
        )}
      </div>
    </div>
  )
}

function TabButton({
  label,
  count,
  active,
  href,
}: {
  label: string
  count: number
  active: boolean
  href: string
}) {
  return (
    <Link
      role="tab"
      aria-selected={active}
      href={href}
      className={`inline-flex items-center gap-2 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-gray-800 text-gray-100'
          : 'text-gray-400 hover:text-gray-200'
      }`}
    >
      {label}
      <span
        className={`text-[11px] font-medium rounded-full min-w-[18px] h-[18px] inline-flex items-center justify-center px-1.5 ${
          active ? 'bg-gray-700 text-gray-200' : 'bg-gray-800 text-gray-500'
        }`}
      >
        {count}
      </span>
    </Link>
  )
}

// ── Markets panel ───────────────────────────────────────────────────────────

interface MarketsPanelProps {
  markets: ReturnType<typeof useWatchlist>['markets']
  onRemove: (slug: string) => void
}

function MarketsPanel({ markets, onRemove }: MarketsPanelProps) {
  if (markets.length === 0) {
    return (
      <EmptyState
        title="No markets tracked yet."
        body='Search for a market and click "Track this Market" to add it to your pipeline.'
        cta="Find a market"
      />
    )
  }
  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-800/50">
            <Th>Market</Th>
            <Th>STR Eligibility</Th>
            <Th hideOn="md">Permit</Th>
            <Th hideOn="md">Owner-Occupied</Th>
            <Th hideOn="lg">Freshness</Th>
            <Th hideOn="lg">Saved</Th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {markets.map(({ marketSlug, savedAt, market }) => (
            <tr key={marketSlug} className="hover:bg-gray-800/30 transition-colors">
              <td className="px-5 py-4">
                <Link
                  href={`/market/${marketSlug}`}
                  className="font-medium text-gray-200 hover:text-accent-500 transition-colors"
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
                  onClick={() => onRemove(marketSlug)}
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
  )
}

// ── Properties panel ────────────────────────────────────────────────────────

interface PropertiesPanelProps {
  properties: WatchlistPropertyEntry[]
  onRemove: (propertyId: string) => void
}

function PropertiesPanel({ properties, onRemove }: PropertiesPanelProps) {
  if (properties.length === 0) {
    return (
      <EmptyState
        title="No properties tracked yet."
        body="Search an address from the home page and click Save on the property page to add it here."
        cta="Search an address"
      />
    )
  }
  return (
    <div className="overflow-hidden rounded-xl border border-gray-800 bg-gray-900">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-800 bg-gray-800/50">
            <Th>Address</Th>
            <Th hideOn="md">Market</Th>
            <Th>STR Eligibility</Th>
            <Th hideOn="lg">Saved</Th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-800">
          {properties.map((entry) => {
            const m = entry.property.market
            const propertyHref =
              m && entry.property.marketId
                ? buildPropertyHref({
                    address: entry.address,
                    marketId: entry.property.marketId,
                    lat: entry.property.latitude,
                    lon: entry.property.longitude,
                    slug: m.slug,
                    marketName: m.name,
                  })
                : null
            const subTitle = [entry.property.city, entry.property.stateCode]
              .filter(Boolean)
              .join(', ')
            return (
              <tr key={entry.propertyId} className="hover:bg-gray-800/30 transition-colors">
                <td className="px-5 py-4">
                  {propertyHref ? (
                    <Link
                      href={propertyHref}
                      className="font-medium text-gray-200 hover:text-accent-500 transition-colors"
                    >
                      {entry.address}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-200">{entry.address}</span>
                  )}
                  {subTitle && (
                    <p className="text-xs text-gray-600 mt-0.5">{subTitle}</p>
                  )}
                </td>
                <td className="px-4 py-4 text-gray-400 hidden md:table-cell">
                  {m ? (
                    <Link
                      href={`/market/${m.slug}`}
                      className="text-gray-300 hover:text-accent-500 transition-colors"
                    >
                      {m.name}
                    </Link>
                  ) : (
                    <span className="text-gray-600">Unsupported</span>
                  )}
                </td>
                <td className="px-4 py-4">
                  {m ? (
                    <StatusBadge status={m.strStatus as StrStatus} size="sm" />
                  ) : (
                    <span className="text-xs text-gray-600">—</span>
                  )}
                </td>
                <td className="px-4 py-4 text-xs text-gray-600 hidden lg:table-cell whitespace-nowrap">
                  {formatLastReviewed(entry.savedAt)}
                </td>
                <td className="px-4 py-4 text-right">
                  <button
                    onClick={() => onRemove(entry.propertyId)}
                    aria-label={`Remove ${entry.address} from watchlist`}
                    className="text-xs text-gray-600 hover:text-red-400 transition-colors"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

// ── Helpers ────────────────────────────────────────────────────────────────

function Th({
  children,
  hideOn,
}: {
  children: React.ReactNode
  hideOn?: 'md' | 'lg'
}) {
  const cls =
    hideOn === 'md'
      ? 'hidden md:table-cell'
      : hideOn === 'lg'
      ? 'hidden lg:table-cell'
      : ''
  return (
    <th
      className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-gray-500 ${cls}`}
    >
      {children}
    </th>
  )
}

function EmptyState({
  title,
  body,
  cta,
}: {
  title: string
  body: string
  cta: string
}) {
  return (
    <div className="rounded-xl border border-dashed border-gray-700 bg-gray-900 px-8 py-16 text-center">
      <p className="text-gray-400 text-base mb-1">{title}</p>
      <p className="text-sm text-gray-600 mb-6">{body}</p>
      <Link
        href="/"
        className="inline-flex items-center gap-2 rounded-lg bg-accent-500 px-5 py-2.5 text-sm font-medium text-white hover:bg-accent-700 transition-colors"
      >
        {cta}
      </Link>
    </div>
  )
}
