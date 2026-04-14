import type { MarketRule } from '@/types/market'
import { formatLastReviewed } from '@/lib/formatters'

interface Props {
  rule: MarketRule
  lastReviewedAt?: string
}

const jurisdictionStyles: Record<'city' | 'county' | 'state', string> = {
  city: 'bg-gray-100 text-gray-500',
  county: 'bg-purple-50 text-purple-600',
  state: 'bg-blue-50 text-blue-600',
}

// Icon components — aria-hidden because the pill text carries the meaning
function CheckIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
      <path d="M3.5 6l1.5 1.5 3.5-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 1.5L10.5 9.5H1.5L6 1.5z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
      <path d="M6 5v2M6 8.5h.01" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

function XIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
      <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

function NeutralIcon() {
  return (
    <svg aria-hidden="true" focusable="false" className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
      <path d="M4 6h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
    </svg>
  )
}

// Derive a visual status style from the rule's value text.
// Returns a pill class and a shape icon — both matter for color-blind users.
function getValueStyle(value: string): { pill: string; icon: React.ReactNode } {
  const v = value.toLowerCase()
  if (
    v.includes('not allowed') ||
    v.includes('not eligible') ||
    v.includes('no permit')
  ) {
    return { pill: 'bg-red-50 text-red-700', icon: <XIcon /> }
  }
  if (v.includes('not required')) {
    return { pill: 'bg-green-50 text-green-700', icon: <CheckIcon /> }
  }
  if (
    v.includes('required') ||
    v.includes('conditional') ||
    v.includes('applies') ||
    v.includes('varies')
  ) {
    return { pill: 'bg-amber-50 text-amber-700', icon: <WarningIcon /> }
  }
  if (v.includes('allowed') || v.includes('eligible')) {
    return { pill: 'bg-green-50 text-green-700', icon: <CheckIcon /> }
  }
  return { pill: 'bg-gray-100 text-gray-600', icon: <NeutralIcon /> }
}

export default function RuleCard({ rule, lastReviewedAt }: Props) {
  const { pill, icon } = getValueStyle(rule.value)

  return (
    <article className="px-5 py-4 bg-white" aria-label={`${rule.label} rule`}>
      {/* Top row: label + jurisdiction tag (left) / status badge (right) */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
            {rule.label}
          </p>
          {rule.jurisdictionLevel && (
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wide ${jurisdictionStyles[rule.jurisdictionLevel]}`}>
              {rule.jurisdictionLevel}
            </span>
          )}
        </div>
        {/* Icon replaces colored dot — shape differentiates status for color-blind users */}
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${pill}`}>
          {icon}
          {rule.value}
        </span>
      </div>

      {/* Details */}
      {rule.details && (
        <p className="mt-2 text-sm text-gray-600 leading-relaxed">
          {rule.details}
        </p>
      )}

      {/* Footer: source link + last verified */}
      <div className="mt-3 flex items-center gap-3 flex-wrap">
        {rule.codeRef && (
          rule.codeUrl ? (
            <a
              href={rule.codeUrl}
              target="_blank"
              rel="noopener noreferrer"
              // Fix: orange-700 achieves ~4.7:1 on white (AA for small text)
              className="inline-flex items-center gap-1 text-xs text-orange-700 hover:text-orange-800 font-medium transition-colors"
            >
              <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              {rule.codeRef}
              <span className="sr-only">(opens in new tab)</span>
            </a>
          ) : (
            <span className="text-xs text-gray-400 font-mono">{rule.codeRef}</span>
          )
        )}

        {lastReviewedAt && (
          <span className="text-xs text-gray-400">
            Last verified {formatLastReviewed(lastReviewedAt)}
          </span>
        )}
      </div>
    </article>
  )
}
