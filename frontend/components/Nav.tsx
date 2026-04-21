'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useWatchlist } from '@/lib/watchlist'
import { useAuth } from '@/lib/auth'

export default function Nav() {
  const pathname = usePathname()
  const { entries, mounted } = useWatchlist()
  const { isSignedIn, email, signOut, mounted: authMounted } = useAuth()

  return (
    <nav className="sticky top-0 z-10 bg-white border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2.5">
          <span className="text-base font-medium text-gray-900 tracking-tight">STR Comply</span>
          <span className="text-[10px] font-medium uppercase tracking-widest bg-neutral-100 text-neutral-500 px-2 py-0.5 rounded-full">
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
                className={`text-[11px] font-medium rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 ${
                  pathname === '/watchlist'
                    ? 'bg-white text-gray-900'
                    : 'bg-gray-900 text-white'
                }`}
              >
                <span aria-hidden="true">{entries.length}</span>
              </span>
            )}
          </Link>

          {/* Auth */}
          {authMounted && (
            isSignedIn ? (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l border-gray-200">
                <span className="text-xs text-gray-400 hidden sm:block truncate max-w-[140px]">
                  {email}
                </span>
                <button
                  onClick={() => signOut()}
                  className="px-3 py-1.5 rounded-full text-sm font-medium text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="ml-2 px-4 py-1.5 rounded-full text-sm font-medium bg-accent-500 text-white hover:bg-accent-700 transition-colors"
              >
                Sign in
              </Link>
            )
          )}
        </div>
      </div>
    </nav>
  )
}
