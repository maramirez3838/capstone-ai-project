import type { FreshnessStatus } from '@/types/market'
import { formatFreshnessStatus, formatLastReviewed } from '@/lib/formatters'

interface Props {
  status: FreshnessStatus
  lastReviewedAt: string
}

// Icon + color — shape differentiates for color-blind users (teal check, orange warning, violet X).
// aria-hidden because the parent aria-label carries the full meaning.
function FreshnessIcon({ status }: { status: FreshnessStatus }) {
  const colorClass = {
    fresh:        'text-freshness-fresh-dot',
    review_due:   'text-freshness-review-due-dot',
    needs_review: 'text-freshness-needs-review-dot',
  }[status]

  if (status === 'fresh') {
    return (
      <svg aria-hidden="true" focusable="false" className={`w-3.5 h-3.5 flex-shrink-0 ${colorClass}`} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
        <path d="M3.5 6l1.5 1.5 3.5-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    )
  }
  if (status === 'review_due') {
    return (
      <svg aria-hidden="true" focusable="false" className={`w-3.5 h-3.5 flex-shrink-0 ${colorClass}`} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M6 1.5L10.5 9.5H1.5L6 1.5z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
        <path d="M6 5v2M6 8.5h.01" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
      </svg>
    )
  }
  return (
    <svg aria-hidden="true" focusable="false" className={`w-3.5 h-3.5 flex-shrink-0 ${colorClass}`} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
      <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

export default function FreshnessBadge({ status, lastReviewedAt }: Props) {
  return (
    <div
      className="inline-flex items-center gap-2"
      aria-label={`Data freshness: ${formatFreshnessStatus(status)}. Last verified ${formatLastReviewed(lastReviewedAt)}.`}
    >
      <FreshnessIcon status={status} />
      <span className="text-sm text-neutral-600">
        <span className="font-medium">{formatFreshnessStatus(status)}</span>
        <span className="mx-1.5 opacity-40">·</span>
        <span className="opacity-70">Last verified {formatLastReviewed(lastReviewedAt)}</span>
      </span>
    </div>
  )
}
