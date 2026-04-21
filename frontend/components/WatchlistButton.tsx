'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useWatchlist } from '@/lib/watchlist'

interface Props {
  marketSlug: string
  marketName: string
  // compact: minimal "Save" style for use inside the compliance card
  compact?: boolean
}

export default function WatchlistButton({ marketSlug, marketName, compact = false }: Props) {
  const router = useRouter()
  const { isSignedIn, mounted: authMounted } = useAuth()
  const { isSaved, save, remove, isAtLimit, mounted: watchlistMounted } = useWatchlist()

  // Compact (card) mode — minimal Save/Saved toggle inside the compliance card
  if (compact) {
    if (!authMounted || !watchlistMounted) {
      return <div className="h-7 w-16 animate-pulse rounded-lg bg-gray-200" />
    }

    if (!isSignedIn) {
      return (
        <button
          onClick={() => router.push(`/login?returnTo=/market/${marketSlug}`)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
        >
          <BookmarkIcon filled={false} />
          Save
        </button>
      )
    }

    const saved = isSaved(marketSlug)
    return (
      <button
        onClick={() => (saved ? remove(marketSlug) : save(marketSlug))}
        className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 text-sm font-medium transition-colors ${
          saved
            ? 'border-gray-300 bg-gray-100 text-gray-600'
            : 'border-gray-300 bg-white text-gray-700 hover:border-gray-400'
        }`}
      >
        <BookmarkIcon filled={saved} />
        {saved ? 'Saved' : 'Save'}
      </button>
    )
  }

  // Full mode (standalone button on market page)
  if (!authMounted || !watchlistMounted) {
    return <div className="h-10 w-44 animate-pulse rounded-lg bg-gray-200" />
  }

  const saved = isSaved(marketSlug)

  if (!isSignedIn) {
    return (
      <button
        onClick={() => router.push(`/login?returnTo=/market/${marketSlug}`)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
      >
        <BookmarkIcon filled={false} />
        Track this Market
      </button>
    )
  }

  if (saved) {
    return (
      <div className="inline-flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-neutral-100 border border-neutral-200 px-4 py-2 text-sm font-medium text-neutral-600">
          <BookmarkIcon filled={true} />
          Tracking
        </span>
        <button
          onClick={() => remove(marketSlug)}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors underline underline-offset-2"
        >
          Remove
        </button>
      </div>
    )
  }

  if (isAtLimit) {
    return (
      <p className="text-sm text-gray-500">
        Market limit reached (25 markets). Remove a market to add {marketName}.
      </p>
    )
  }

  return (
    <button
      onClick={() => save(marketSlug)}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
    >
      <BookmarkIcon filled={false} />
      Track this Market
    </button>
  )
}

function BookmarkIcon({ filled }: { filled: boolean }) {
  if (filled) {
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    )
  }
  return (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  )
}
