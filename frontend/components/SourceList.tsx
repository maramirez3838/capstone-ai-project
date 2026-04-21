'use client'

import type { MarketSource } from '@/types/market'
import { logEvent } from '@/lib/telemetry'

interface Props {
  sources: MarketSource[]
  marketSlug: string
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
      {sources.map((source, i) => (
        <li key={source.id ?? i}>
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => handleClick(source)}
            className="group flex items-center gap-3 rounded-xl px-4 py-3 hover:bg-gray-50 transition-colors border border-gray-100"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 flex-shrink-0 text-gray-300 group-hover:text-accent-500 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
              />
            </svg>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-700 group-hover:text-gray-900 transition-colors truncate">
                {source.title}
              </p>
              {source.publisher && (
                <p className="text-xs text-gray-400 mt-0.5">{source.publisher}</p>
              )}
            </div>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4 flex-shrink-0 text-gray-300 group-hover:text-gray-400 transition-colors"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  )
}
