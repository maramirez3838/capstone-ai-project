import type { Market } from '@/types/market'
import WatchlistButton from './WatchlistButton'
import { formatLastReviewed } from '@/lib/formatters'

interface Props {
  market: Market
}

const statusConfig: Record<
  Market['strStatus'],
  { label: string; icon: string; heading: string; bg: string; text: string; border: string }
> = {
  allowed: {
    label: 'STR Eligible',
    icon: '✓',
    heading: 'Short-term rentals are permitted',
    bg: 'bg-status-allowed-bg',
    text: 'text-status-allowed-text',
    border: 'border-status-allowed-border',
  },
  conditional: {
    label: 'Permitted with Restrictions',
    icon: '⚠',
    heading: 'STRs allowed — conditions apply',
    bg: 'bg-status-conditional-bg',
    text: 'text-status-conditional-text',
    border: 'border-status-conditional-border',
  },
  not_allowed: {
    label: 'Not Permitted',
    icon: '✕',
    heading: 'Short-term rentals are not allowed',
    bg: 'bg-status-not-allowed-bg',
    text: 'text-status-not-allowed-text',
    border: 'border-status-not-allowed-border',
  },
}

// Freshness confidence uses freshness tokens — not status colors.
const confidenceMap: Record<Market['freshnessStatus'], { label: string; color: string }> = {
  fresh:       { label: 'High',   color: 'text-freshness-fresh-dot' },
  review_due:  { label: 'Medium', color: 'text-freshness-review-due-dot' },
  needs_review: { label: 'Low',   color: 'text-freshness-needs-review-dot' },
}

export default function ComplianceSummaryCard({ market }: Props) {
  const { label, icon, heading, bg, text, border } = statusConfig[market.strStatus]
  const confidence = confidenceMap[market.freshnessStatus]

  return (
    <div className="rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
      {/* Status banner */}
      <div className={`${bg} ${border} border-b px-6 py-4 flex items-center justify-between`}>
        <div className="flex items-center gap-3">
          <span className={`text-xl font-medium leading-none ${text}`}>{icon}</span>
          <div>
            <p className={`text-xs font-medium uppercase tracking-widest ${text} opacity-70 mb-0.5`}>
              {label}
            </p>
            <p className={`text-sm font-medium ${text}`}>{heading}</p>
          </div>
        </div>
        <WatchlistButton marketSlug={market.slug} marketName={market.name} compact />
      </div>

      {/* Body */}
      <div className="bg-white px-6 py-5">
        {/* Location pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          <span className="inline-flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1 text-xs text-gray-600 border border-gray-100">
            <span className="font-medium text-gray-400 uppercase text-[9px] tracking-wider">City</span>
            {market.name}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1 text-xs text-gray-600 border border-gray-100">
            <span className="font-medium text-gray-400 uppercase text-[9px] tracking-wider">County</span>
            {market.countyName}
          </span>
          <span className="inline-flex items-center gap-1.5 bg-gray-50 rounded-full px-3 py-1 text-xs text-gray-600 border border-gray-100">
            <span className="font-medium text-gray-400 uppercase text-[9px] tracking-wider">State</span>
            {market.stateCode}
          </span>
        </div>

        {/* Summary */}
        <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400 mb-2">
          Plain-English Summary
        </p>
        <p className="text-sm text-gray-700 leading-relaxed">{market.summary}</p>

        {/* Meta row */}
        <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-400">
          <span>
            Data confidence{' '}
            <span className={`font-medium ${confidence.color}`}>{confidence.label}</span>
          </span>
          <span>·</span>
          <span>Last verified {formatLastReviewed(market.lastReviewedAt)}</span>
        </div>
      </div>
    </div>
  )
}
