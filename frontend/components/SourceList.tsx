'use client'

import type { MarketSource } from '@/types/market'
import { logEvent } from '@/lib/telemetry'

interface Props {
  sources: MarketSource[]
  marketSlug: string
}

// Icon components
function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className={className ?? 'h-4 w-4'}
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
      />
    </svg>
  )
}

function ChevronRightIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4 flex-shrink-0 text-gray-300 group-hover:text-gray-400 transition-colors"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
      aria-hidden="true"
      focusable="false"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  )
}

// Broken / unverified source status badge — shown when compliance monitor flags a source
function SourceStatusBadge({ status }: { status: string }) {
  if (status === 'active') return null

  const configs: Record<string, { label: string; className: string; icon: React.ReactNode }> = {
    broken: {
      label: 'Link may be broken',
      className: 'bg-red-50 text-red-600 border border-red-100',
      icon: (
        <svg aria-hidden="true" focusable="false" className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
          <path d="M4 4l4 4M8 4l-4 4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        </svg>
      ),
    },
    pending_review: {
      label: 'Pending review',
      className: 'bg-amber-50 text-amber-700 border border-amber-100',
      icon: (
        <svg aria-hidden="true" focusable="false" className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6 1.5L10.5 9.5H1.5L6 1.5z" stroke="currentColor" strokeWidth="1" strokeLinejoin="round"/>
          <path d="M6 5v2M6 8.5h.01" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        </svg>
      ),
    },
    replaced: {
      label: 'Replaced',
      className: 'bg-neutral-50 text-neutral-500 border border-neutral-100',
      icon: (
        <svg aria-hidden="true" focusable="false" className="w-3 h-3 flex-shrink-0" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="6" cy="6" r="5.5" stroke="currentColor" strokeWidth="1"/>
          <path d="M4 6h4" stroke="currentColor" strokeWidth="1.25" strokeLinecap="round"/>
        </svg>
      ),
    },
  }

  const config = configs[status] ?? configs['pending_review']

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${config.className}`}>
      {config.icon}
      {config.label}
    </span>
  )
}

export default function SourceList({ sources, marketSlug }: Props) {
  function handleClick(source: MarketSource) {
    logEvent('source_clicked', {
      marketSlug,
      metadata: { sourceId: source.id, sourceTitle: source.title },
    })
  }

  return (
    <ul className="space-y-2">
      {sources.map((source, i) => {
        const isBroken = source.sourceStatus && source.sourceStatus !== 'active'
        return (
          <li key={source.id ?? i}>
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => handleClick(source)}
              className={`group flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors border ${isBroken ? 'border-red-100 bg-red-50/30' : 'border-gray-100'}`}
            >
              <ExternalLinkIcon className={`h-4 w-4 flex-shrink-0 transition-colors ${isBroken ? 'text-red-300 group-hover:text-red-500' : 'text-gray-300 group-hover:text-accent-500'}`} />
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-medium transition-colors truncate ${isBroken ? 'text-gray-500 group-hover:text-gray-700' : 'text-gray-700 group-hover:text-gray-900'}`}>
                  {source.title}
                </p>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {source.publisher && (
                    <p className="text-xs text-gray-400">{source.publisher}</p>
                  )}
                  {source.sourceStatus && (
                    <SourceStatusBadge status={source.sourceStatus} />
                  )}
                </div>
              </div>
              <ChevronRightIcon />
              <span className="sr-only">(opens in new tab)</span>
            </a>
          </li>
        )
      })}
    </ul>
  )
}
