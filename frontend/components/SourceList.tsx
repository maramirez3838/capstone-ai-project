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
            className="group flex items-start gap-3 rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 hover:border-indigo-700 hover:bg-indigo-950/30 transition-colors"
          >
            {/* External link icon */}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="mt-0.5 h-4 w-4 flex-shrink-0 text-gray-600 group-hover:text-indigo-400 transition-colors"
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

            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-300 group-hover:text-indigo-300 transition-colors">
                {source.title}
              </p>
              {source.publisher && (
                <p className="text-xs text-gray-600 mt-0.5">{source.publisher}</p>
              )}
            </div>
          </a>
        </li>
      ))}
    </ul>
  )
}
