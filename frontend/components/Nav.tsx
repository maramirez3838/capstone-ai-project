'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWatchlist } from '@/lib/watchlist'

export default function Nav() {
  const pathname = usePathname()
  const { entries, mounted } = useWatchlist()

  return (
    <nav className="sticky top-0 z-10 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-base font-semibold text-gray-900 tracking-tight">STR Comply</span>
          <span className="text-[10px] font-bold uppercase tracking-widest bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full">
            BETA
          </span>
        </Link>

        {/* Nav links */}
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              pathname === '/'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Lookup
          </Link>

          <Link
            href="/watchlist"
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              pathname === '/watchlist'
                ? 'bg-gray-900 text-white'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100'
            }`}
          >
            Watchlist
            {mounted && entries.length > 0 && (
              <span
                aria-label={`${entries.length} saved market${entries.length !== 1 ? 's' : ''}`}
                className={`text-[11px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
                  pathname === '/watchlist'
                    ? 'bg-white text-gray-900'
                    : 'bg-gray-900 text-white'
                }`}
              >
                <span aria-hidden="true">{entries.length}</span>
              </span>
            )}
          </Link>
        </div>
      </div>
    </nav>
  )
}
