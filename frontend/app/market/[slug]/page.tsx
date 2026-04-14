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

      {/* Market header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight">{market.name}</h1>
        <p className="text-gray-500 mt-1 text-sm">
          {market.countyName}
          {market.regionLabel && <span> · {market.regionLabel}</span>}
          {' '}· {market.stateCode}
        </p>
      </div>

      {/* Compliance summary */}
      <ComplianceSummaryCard market={market} />

      {/* Rule breakdown */}
      {sortedRules.length > 0 && (
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-semibold text-gray-900">Rule Breakdown</h2>
            <span className="text-xs text-gray-400">
              {sortedRules.length} rule{sortedRules.length !== 1 ? 's' : ''} · source-linked
            </span>
          </div>
          <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 overflow-hidden">
            {sortedRules.map((rule) => (
              <RuleCard key={rule.ruleKey} rule={rule} lastReviewedAt={market.lastReviewedAt} />
            ))}
          </div>
        </div>
      )}

      {/* Source documents */}
      <div className="mt-10">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-gray-400 mb-3">
          Source Documents
        </h2>
        <SourceList sources={sortedSources} marketSlug={market.slug} />
      </div>

      {/* Freshness */}
      <div className="mt-6">
        <FreshnessBadge status={market.freshnessStatus} lastReviewedAt={market.lastReviewedAt} />
        {market.freshnessStatus === 'needs_review' && (
          <p className="mt-3 text-sm text-orange-700 bg-orange-50 border border-orange-100 rounded-xl px-4 py-3">
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
