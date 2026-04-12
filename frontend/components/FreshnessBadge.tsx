import type { FreshnessStatus } from '@/types/market'
import { formatFreshnessStatus, formatLastReviewed } from '@/lib/formatters'

interface Props {
  status: FreshnessStatus
  lastReviewedAt: string
}

const styles: Record<FreshnessStatus, string> = {
  fresh: 'bg-green-950/60 text-green-400 border border-green-800',
  review_due: 'bg-yellow-950/60 text-yellow-400 border border-yellow-800',
  needs_review: 'bg-orange-950/60 text-orange-400 border border-orange-800',
}

const icons: Record<FreshnessStatus, string> = {
  fresh: '✓',
  review_due: '!',
  needs_review: '⚠',
}

export default function FreshnessBadge({ status, lastReviewedAt }: Props) {
  return (
    <div
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${styles[status]}`}
    >
      <span className="font-bold text-base leading-none">{icons[status]}</span>
      <span>
        <span className="font-medium">{formatFreshnessStatus(status)}</span>
        <span className="mx-1.5 opacity-40">·</span>
        <span className="opacity-70">Last reviewed {formatLastReviewed(lastReviewedAt)}</span>
      </span>
    </div>
  )
}
