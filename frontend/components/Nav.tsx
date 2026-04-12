'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'

export default function Nav() {
  const pathname = usePathname()
  const router = useRouter()
  const { isSignedIn, email, signOut, mounted } = useAuth()

  function handleSignOut() {
    signOut()
    router.push('/')
  }

  const linkBase = 'text-sm font-medium transition-colors'
  const linkActive = 'text-indigo-400'
  const linkInactive = 'text-gray-400 hover:text-gray-100'

  return (
    <nav className="sticky top-0 z-10 bg-gray-950 border-b border-gray-800">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link
          href="/"
          className="text-base font-bold text-gray-100 tracking-tight hover:text-indigo-400 transition-colors"
        >
          STR Comply
        </Link>

        {/* Links */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            className={`${linkBase} ${pathname === '/' ? linkActive : linkInactive}`}
          >
            Search
          </Link>
          <Link
            href="/watchlist"
            className={`${linkBase} ${pathname === '/watchlist' ? linkActive : linkInactive}`}
          >
            Watchlist
          </Link>

          {mounted ? (
            isSignedIn ? (
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500 hidden sm:block">{email}</span>
                <button
                  onClick={handleSignOut}
                  className="text-sm font-medium text-gray-500 hover:text-gray-200 transition-colors"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="text-sm font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Sign in
              </Link>
            )
          ) : (
            <div className="w-16 h-4 bg-gray-800 rounded animate-pulse" />
          )}
        </div>
      </div>
    </nav>
  )
}
