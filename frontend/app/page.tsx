import Link from 'next/link'
import SearchBar from '@/components/SearchBar'
import StatusBadge from '@/components/StatusBadge'
import { getAllMarkets } from '@/lib/search'

export default function HomePage() {
  const markets = getAllMarkets()

  return (
    <div className="max-w-3xl mx-auto px-6 py-16">
      {/* Hero */}
      <div className="text-center mb-12">
        <div className="inline-flex items-center gap-2 rounded-full bg-indigo-950/60 border border-indigo-900 px-4 py-1.5 text-xs font-medium text-indigo-400 mb-6">
          LA-area markets · Updated regularly
        </div>
        <h1 className="text-4xl font-bold text-gray-100 tracking-tight mb-4">
          Know the STR rules before you invest.
        </h1>
        <p className="text-lg text-gray-400 max-w-xl mx-auto leading-relaxed">
          Fast, source-linked short-term rental compliance summaries for
          LA-area markets. Plain English, official sources, freshness signals.
        </p>
      </div>

      {/* Search */}
      <SearchBar />

      {/* Trust signals */}
      <div className="mt-8 flex items-center justify-center gap-6 text-sm text-gray-600">
        <span className="flex items-center gap-1.5">
          <span className="text-green-500">✓</span> Grounded summaries
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-green-500">✓</span> Official sources only
        </span>
        <span className="flex items-center gap-1.5">
          <span className="text-green-500">✓</span> Freshness indicators
        </span>
      </div>

      {/* Supported markets */}
      <div className="mt-14">
        <p className="text-xs font-semibold uppercase tracking-widest text-gray-600 mb-4">
          Supported markets
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {markets.map((m) => (
            <Link
              key={m.slug}
              href={`/market/${m.slug}`}
              className="group flex items-center justify-between rounded-lg border border-gray-800 bg-gray-900 px-4 py-3 hover:border-indigo-700 hover:bg-gray-800/60 transition-all"
            >
              <div>
                <p className="text-sm font-semibold text-gray-200 group-hover:text-indigo-300 transition-colors">
                  {m.name}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">{m.countyName}</p>
              </div>
              <StatusBadge status={m.strStatus} size="sm" />
            </Link>
          ))}
        </div>
      </div>

      {/* Footer disclaimer */}
      <p className="mt-12 text-center text-xs text-gray-600 leading-relaxed max-w-lg mx-auto">
        Summaries are for informational purposes only and are not legal advice.
        Always verify with official municipal sources.
      </p>
    </div>
  )
}
