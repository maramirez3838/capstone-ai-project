import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getMarketBySlug, getAllMarkets } from '@/lib/search'
import ComplianceSummaryCard from '@/components/ComplianceSummaryCard'
import RuleCard from '@/components/RuleCard'
import SourceList from '@/components/SourceList'
import FreshnessBadge from '@/components/FreshnessBadge'
import WatchlistButton from '@/components/WatchlistButton'
import Disclaimer from '@/components/Disclaimer'

export function generateStaticParams() {
  return getAllMarkets().map((m) => ({ slug: m.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const market = getMarketBySlug(slug)
  if (!market) return {}
  return {
    title: `${market.name} STR Compliance — STR Comply`,
    description: `Short-term rental rules for ${market.name}, ${market.countyName}. ${market.summary.slice(0, 120)}...`,
  }
}

export default async function MarketPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const market = getMarketBySlug(slug)

  if (!market) notFound()

  const sortedRules = [...market.rules].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  )
  const sortedSources = [...market.sources].sort(
    (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0)
  )

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      {/* Back */}
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-400 transition-colors mb-8"
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

      {/* 1. Market header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-100 tracking-tight">{market.name}</h1>
        <p className="text-gray-500 mt-1.5 text-sm">
          {market.countyName}
          {market.regionLabel && <span> · {market.regionLabel}</span>}
          {' '}· {market.stateCode}
        </p>
      </div>

      {/* 2. Compliance summary card */}
      <ComplianceSummaryCard market={market} />

      {/* 3. Key rule cards */}
      {sortedRules.length > 0 && (
        <div className="mt-10">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
            Key Rules
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {sortedRules.map((rule) => (
              <RuleCard key={rule.ruleKey} rule={rule} />
            ))}
          </div>
        </div>
      )}

      {/* 4. Source links */}
      <div className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-4">
          Official Sources
        </h2>
        <SourceList sources={sortedSources} marketSlug={market.slug} />
      </div>

      {/* 5. Freshness / last reviewed */}
      <div className="mt-8">
        <FreshnessBadge status={market.freshnessStatus} lastReviewedAt={market.lastReviewedAt} />
        {market.freshnessStatus === 'needs_review' && (
          <p className="mt-2 text-sm text-orange-400 bg-orange-950/40 border border-orange-900 rounded-lg px-4 py-2">
            This market is overdue for review. Verify current rules directly
            with the official sources above before relying on this summary.
          </p>
        )}
      </div>

      {/* 6. Watchlist action */}
      <div className="mt-8">
        <WatchlistButton marketSlug={market.slug} marketName={market.name} />
      </div>

      {/* 7. Disclaimer */}
      <div className="mt-10 pt-8 border-t border-gray-800">
        <Disclaimer />
      </div>
    </div>
  )
}
