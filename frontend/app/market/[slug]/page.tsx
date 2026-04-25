import { notFound } from 'next/navigation'
import { Suspense } from 'react'
import Link from 'next/link'
import { db } from '@/lib/db'
import ComplianceSummaryCard from '@/components/ComplianceSummaryCard'
import RuleList from '@/components/RuleList'
import SourceList from '@/components/SourceList'
import FreshnessBadge from '@/components/FreshnessBadge'
import WatchlistButton from '@/components/WatchlistButton'
import Disclaimer from '@/components/Disclaimer'
import PropertyMarketSwitcher from '@/components/PropertyMarketSwitcher'
import PropertyHeader from '@/components/PropertyHeader'
import MarketViewLogger from '@/components/MarketViewLogger'
import { buildPropertyHref, buildMarketHrefFromProperty } from '@/lib/property-urls'
import type { Market } from '@/types/market'

// Tell Next.js which slugs to pre-render at build time
export async function generateStaticParams() {
  const markets = await db.market.findMany({
    where: { supportStatus: 'supported' },
    select: { slug: true },
  })
  return markets.map((m: { slug: string }) => ({ slug: m.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const market = await db.market.findUnique({
    where: { slug },
    select: { name: true, countyName: true, summary: true },
  })
  if (!market) return {}
  return {
    title: `${market.name} STR Compliance — STR Comply`,
    description: `Short-term rental rules for ${market.name}, ${market.countyName}. ${market.summary.slice(0, 120)}...`,
  }
}

export default async function MarketPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  const { slug } = await params
  const sp = await searchParams

  const raw = await db.market.findUnique({
    where: { slug },
    include: {
      rules: {
        orderBy: { displayOrder: 'asc' },
        include: {
          linkedSources: { include: { source: true } },
        },
      },
      sources: { orderBy: { displayOrder: 'asc' } },
    },
  })

  if (!raw || raw.supportStatus === 'archived') notFound()

  // Map DB record to the Market type the components expect
  const market: Market = {
    id: raw.id,
    slug: raw.slug,
    name: raw.name,
    stateCode: raw.stateCode,
    countyName: raw.countyName ?? '',
    regionLabel: raw.regionLabel ?? undefined,
    strStatus: raw.strStatus as Market['strStatus'],
    permitRequired: raw.permitRequired as Market['permitRequired'],
    ownerOccupancyRequired: raw.ownerOccupancyRequired as Market['ownerOccupancyRequired'],
    freshnessStatus: raw.freshnessStatus as Market['freshnessStatus'],
    summary: raw.summary,
    notableRestrictions: raw.notableRestrictions ?? undefined,
    lastReviewedAt: raw.lastReviewedAt.toISOString(),
    aliases: [], // FE-only field; not stored on BE Market
    rules: raw.rules.map((r: (typeof raw.rules)[number]) => ({
      ruleKey: r.ruleKey,
      label: r.label,
      value: r.value,
      details: r.details ?? undefined,
      codeRef: r.codeRef ?? undefined,
      codeUrl: r.codeUrl ?? undefined,
      displayOrder: r.displayOrder,
      jurisdictionLevel: r.jurisdictionLevel as Market['rules'][number]['jurisdictionLevel'],
      applicableTo: r.applicableTo as Market['rules'][number]['applicableTo'],
      sources: r.linkedSources.map((ls: (typeof r.linkedSources)[number]) => ({
        id: ls.source.id,
        title: ls.source.title,
        url: ls.source.url,
        sourceType: ls.source.sourceType as Market['sources'][number]['sourceType'],
        publisher: ls.source.publisher ?? undefined,
        displayOrder: ls.source.displayOrder,
        sourceStatus: ls.source.sourceStatus,
      })),
    })),
    sources: raw.sources.map((s: (typeof raw.sources)[number]) => ({
      id: s.id,
      title: s.title,
      url: s.url,
      sourceType: s.sourceType as Market['sources'][number]['sourceType'],
      publisher: s.publisher ?? undefined,
      displayOrder: s.displayOrder,
      sourceStatus: s.sourceStatus,
    })),
  }

  // Render the property↔market switcher only when the user arrived here from
  // an address search. Direct slug navigation has no property context to flip to.
  const fromProperty = sp.from === 'property'
  const fromAddress = typeof sp.address === 'string' ? sp.address : undefined
  const fromMarketId = typeof sp.marketId === 'string' ? sp.marketId : undefined
  const fromLat = typeof sp.lat === 'string' ? sp.lat : undefined
  const fromLon = typeof sp.lon === 'string' ? sp.lon : undefined
  const showSwitcher =
    fromProperty && Boolean(fromAddress && fromMarketId && fromLat && fromLon)

  const switcherCtx = showSwitcher
    ? {
        address: fromAddress!,
        marketId: fromMarketId!,
        lat: fromLat!,
        lon: fromLon!,
        slug: market.slug,
        marketName: market.name,
      }
    : null
  const propertyHref = switcherCtx ? buildPropertyHref(switcherCtx) : ''
  const marketHref = switcherCtx ? buildMarketHrefFromProperty(switcherCtx) : ''

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <MarketViewLogger
        marketSlug={market.slug}
        source={showSwitcher ? 'property' : 'direct'}
      />
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 transition-colors mb-8"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to search
      </Link>

      {showSwitcher ? (
        <>
          {/* Property is the user's anchor when arrived via address search —
              keep the full address pinned at the top above the switcher. */}
          <PropertyHeader address={fromAddress!} />

          <div className="mb-6">
            <PropertyMarketSwitcher
              propertyHref={propertyHref}
              marketHref={marketHref}
              current="market"
            />
          </div>

          {/* Smaller market identifier so the user knows which jurisdiction's
              rules they're viewing — full H1 is reserved for the address above. */}
          <div className="mb-6">
            <h2 className="text-base font-medium text-gray-900">
              Market Requirements — {market.name}
            </h2>
            <p className="text-gray-500 mt-0.5 text-xs">
              {market.countyName}
              {market.regionLabel && <span> · {market.regionLabel}</span>}
              {' '}· {market.stateCode}
            </p>
          </div>
        </>
      ) : (
        // Direct nav (search by market name, watchlist click, etc.) — keep the
        // existing market H1 unchanged. No regression for non-property entry points.
        <div className="mb-6">
          <h1 className="text-3xl font-medium text-gray-900 tracking-tight">{market.name}</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {market.countyName}
            {market.regionLabel && <span> · {market.regionLabel}</span>}
            {' '}· {market.stateCode}
          </p>
        </div>
      )}

      {/* Compliance summary */}
      <ComplianceSummaryCard market={market} />

      {/* Rule breakdown with STR type toggle */}
      {market.rules.length > 0 && (
        <div className="mt-10">
          <Suspense
            fallback={
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-medium text-gray-900">Rule Breakdown</h2>
                </div>
                <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 overflow-hidden animate-pulse">
                  {market.rules.map((rule) => (
                    <div key={rule.ruleKey} className="px-5 py-4 bg-white">
                      <div className="h-3 bg-gray-100 rounded w-1/3" />
                    </div>
                  ))}
                </div>
              </div>
            }
          >
            <RuleList
              rules={market.rules}
              lastReviewedAt={market.lastReviewedAt}
              allSources={market.sources}
            />
          </Suspense>
        </div>
      )}

      {/* Source documents */}
      <div className="mt-10">
        <h2 className="text-xs font-medium uppercase tracking-widest text-gray-400 mb-3">
          Source Documents
        </h2>
        <SourceList sources={market.sources} marketSlug={market.slug} />
      </div>

      {/* Freshness */}
      <div className="mt-6">
        <FreshnessBadge status={market.freshnessStatus} lastReviewedAt={market.lastReviewedAt} />
        {market.freshnessStatus === 'needs_review' && (
          <p className="mt-3 text-sm text-neutral-600 bg-neutral-50 border border-neutral-200 rounded-xl px-4 py-3">
            This summary is overdue for verification. Do not rely on it for active
            underwriting — check the source documents above before making any decisions.
          </p>
        )}
      </div>

      {/* Watchlist */}
      <div className="mt-6">
        <WatchlistButton marketSlug={market.slug} marketName={market.name} />
      </div>

      {/* Disclaimer */}
      <div className="mt-10 pt-8 border-t border-gray-100">
        <Disclaimer />
      </div>
    </div>
  )
}
