'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useWatchlist } from '@/lib/watchlist'

interface Props {
  marketSlug: string
  marketName: string
}

export default function WatchlistButton({ marketSlug, marketName }: Props) {
  const router = useRouter()
  const { isSignedIn, mounted: authMounted } = useAuth()
  const { isSaved, save, remove, isAtLimit, mounted: watchlistMounted } = useWatchlist()

  // Avoid hydration flash — render nothing until client state is ready
  if (!authMounted || !watchlistMounted) {
    return <div className="h-10 w-44 animate-pulse rounded-lg bg-gray-800" />
  }

  const saved = isSaved(marketSlug)

  if (!isSignedIn) {
    return (
      <button
        onClick={() => router.push(`/login?returnTo=/market/${marketSlug}`)}
        className="inline-flex items-center gap-2 rounded-lg border border-indigo-800 bg-indigo-950/40 px-4 py-2 text-sm font-medium text-indigo-400 hover:bg-indigo-900/40 hover:border-indigo-600 transition-colors"
      >
        <BookmarkIcon />
        Save to Watchlist
      </button>
    )
  }

  if (saved) {
    return (
      <div className="inline-flex items-center gap-3">
        <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-950/60 border border-indigo-800 px-4 py-2 text-sm font-medium text-indigo-400">
          <BookmarkFilledIcon />
          Saved to Watchlist
        </span>
        <button
          onClick={() => remove(marketSlug)}
          className="text-sm text-gray-600 hover:text-red-400 transition-colors underline underline-offset-2"
        >
          Remove
        </button>
      </div>
    )
  }

  if (isAtLimit) {
    return (
      <p className="text-sm text-gray-500">
        Watchlist limit reached (25 markets). Remove a market to save {marketName}.
      </p>
    )
  }

  return (
    <button
      onClick={() => save(marketSlug)}
      className="inline-flex items-center gap-2 rounded-lg border border-indigo-800 bg-indigo-950/40 px-4 py-2 text-sm font-medium text-indigo-400 hover:bg-indigo-900/40 hover:border-indigo-600 transition-colors"
    >
      <BookmarkIcon />
      Save to Watchlist
    </button>
  )
}

function BookmarkIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
      />
    </svg>
  )
}

function BookmarkFilledIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  )
}
