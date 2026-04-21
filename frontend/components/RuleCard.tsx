'use client'

import { useState } from 'react'
import type { MarketRule, MarketSource } from '@/types/market'
import { formatLastReviewed } from '@/lib/formatters'

interface Props {
  rule: MarketRule
  lastReviewedAt?: string
  allSources?: MarketSource[]  // all market-level sources, used as supplemental fallback
}

// All jurisdiction levels use identical neutral styling — coloring by level
// would create a false visual vocabulary that conflicts with status/freshness.
const jurisdictionStyles: Record<'city' | 'county' | 'state', string> = {
  city:   'bg-neutral-100 text-neutral-600',
  county: 'bg-neutral-100 text-neutral-600',
  state:  'bg-neutral-100 text-neutral-600',
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

// Rule value pills use neutral styling — status colors are reserved for STR legality only.
// Icon shape (not color) is the primary differentiator.
function getValueStyle(value: string): { pill: string; icon: React.ReactNode } {
  const v = value.toLowerCase()
  if (v.includes('not allowed') || v.includes('not eligible') || v.includes('no permit')) {
    return { pill: 'bg-neutral-100 text-neutral-700', icon: <XIcon /> }
  }
  if (v.includes('not required')) {
    return { pill: 'bg-neutral-100 text-neutral-700', icon: <CheckIcon /> }
  }
  if (v.includes('required') || v.includes('conditional') || v.includes('applies') || v.includes('varies')) {
    return { pill: 'bg-neutral-100 text-neutral-700', icon: <WarningIcon /> }
  }
  if (v.includes('allowed') || v.includes('eligible')) {
    return { pill: 'bg-neutral-100 text-neutral-700', icon: <CheckIcon /> }
  }
  return { pill: 'bg-neutral-100 text-neutral-600', icon: <NeutralIcon /> }
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg" className={className ?? 'h-3 w-3'} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  )
}

export default function RuleCard({ rule, lastReviewedAt, allSources }: Props) {
  const [sourcesOpen, setSourcesOpen] = useState(false)
  const { pill, icon } = getValueStyle(rule.value)

  // Rule-specific sources (from join table) take priority.
  // Supplement with any market-level sources not already included.
  const linkedIds = new Set((rule.sources ?? []).map((s) => s.id))
  const supplemental = (allSources ?? []).filter((s) => !linkedIds.has(s.id))
  const hasAnySources = (rule.sources?.length ?? 0) > 0 || supplemental.length > 0

  return (
    <article className="bg-white" aria-label={`${rule.label} rule`}>
      <div className="px-5 py-4">
        {/* Top row: label + jurisdiction tag (left) / status badge (right) */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-[11px] font-medium uppercase tracking-widest text-gray-400">
              {rule.label}
            </p>
            {rule.jurisdictionLevel && (
              <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${jurisdictionStyles[rule.jurisdictionLevel]}`}>
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

        {/* Footer: code citation + last verified + sources toggle */}
        <div className="mt-3 flex items-center gap-3 flex-wrap">
          {rule.codeRef && (
            rule.codeUrl ? (
              <a
                href={rule.codeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-accent-500 hover:text-accent-700 font-medium transition-colors"
              >
                <ExternalLinkIcon />
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

          {hasAnySources && (
            <button
              type="button"
              onClick={() => setSourcesOpen((o) => !o)}
              className="ml-auto text-xs text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-0.5"
              aria-expanded={sourcesOpen}
            >
              Sources
              <svg aria-hidden="true" focusable="false" className={`w-3 h-3 transition-transform ${sourcesOpen ? 'rotate-180' : ''}`} viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 4.5l3 3 3-3" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Expandable sources drawer */}
      {sourcesOpen && hasAnySources && (
        <div className="border-t border-gray-50 bg-gray-50 px-5 py-3 space-y-2">
          {(rule.sources ?? []).map((s) => (
            <a
              key={s.id ?? s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 group"
            >
              <ExternalLinkIcon className="h-3 w-3 mt-0.5 flex-shrink-0 text-gray-400 group-hover:text-accent-500 transition-colors" />
              <span className="text-xs">
                <span className="text-gray-700 group-hover:text-accent-500 font-medium transition-colors">{s.title}</span>
                {s.publisher && <span className="text-gray-400 ml-1">· {s.publisher}</span>}
              </span>
              <span className="sr-only">(opens in new tab)</span>
            </a>
          ))}

          {supplemental.length > 0 && (rule.sources?.length ?? 0) > 0 && (
            <p className="text-[10px] font-medium uppercase tracking-widest text-gray-400 pt-1">
              Additional market sources
            </p>
          )}

          {supplemental.map((s) => (
            <a
              key={s.id ?? s.url}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start gap-2 group"
            >
              <ExternalLinkIcon className="h-3 w-3 mt-0.5 flex-shrink-0 text-gray-400 group-hover:text-accent-500 transition-colors" />
              <span className="text-xs">
                <span className="text-gray-700 group-hover:text-accent-500 font-medium transition-colors">{s.title}</span>
                {s.publisher && <span className="text-gray-400 ml-1">· {s.publisher}</span>}
              </span>
              <span className="sr-only">(opens in new tab)</span>
            </a>
          ))}
        </div>
      )}
    </article>
  )
}
