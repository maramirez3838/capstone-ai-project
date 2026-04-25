'use client'

// Save-to-watchlist button. Polymorphic via discriminated kind: 'market' or
// 'property'. Both variants honor the auth-mounted SSR guard and redirect
// signed-out users to /login?returnTo=... in compact and full modes
// (per lessons.md 2026-04-19 — never silently no-op a click).

import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { useWatchlist } from '@/lib/watchlist'

type CommonProps = { compact?: boolean }

type MarketProps = CommonProps & {
  kind: 'market'
  marketSlug: string
  marketName: string
}

type PropertyProps = CommonProps & {
  kind: 'property'
  propertyAddress: string
  propertyDisplay: string
  // Property URLs are parametric (address/marketId/lat/lon/slug/marketName)
  // so the caller has to hand returnTo in for the sign-in redirect.
  returnTo: string
}

type Props = MarketProps | PropertyProps

export default function WatchlistButton(props: Props) {
  const router = useRouter()
  const { isSignedIn, mounted: authMounted } = useAuth()
  const wl = useWatchlist()
  const watchlistMounted = wl.mounted

  const compact = props.compact ?? false
  const isMarket = props.kind === 'market'

  const saved = isMarket
    ? wl.isSavedMarket(props.marketSlug)
    : wl.isSavedProperty(props.propertyAddress)
  const atLimit = isMarket ? wl.isAtMarketLimit : wl.isAtPropertyLimit
  const displayName = isMarket ? props.marketName : props.propertyDisplay

  const returnTo = isMarket ? `/market/${props.marketSlug}` : props.returnTo

  function doSave() {
    if (isMarket) wl.saveMarket(props.marketSlug)
    else wl.saveProperty(props.propertyAddress)
  }

  function doRemove() {
    if (isMarket) wl.removeMarket(props.marketSlug)
    else {
      const entry = wl.properties.find((p) => p.address === props.propertyAddress)
      if (entry) wl.removeProperty(entry.propertyId)
    }
  }

  // Compact mode — minimal Save/Saved toggle (used inside ComplianceSummaryCard)
  if (compact) {
    if (!authMounted || !watchlistMounted) {
      return <div className="h-7 w-16 animate-pulse rounded-lg bg-gray-200" />
    }

    if (!isSignedIn) {
      return (
        <button
          onClick={() => router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
        >
          <BookmarkIcon filled={false} />
          Save
        </button>
      )
    }

    return (
      <button
        onClick={() => (saved ? doRemove() : doSave())}
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

  // Full mode (standalone button on market/property page)
  if (!authMounted || !watchlistMounted) {
    return <div className="h-10 w-44 animate-pulse rounded-lg bg-gray-200" />
  }

  const trackLabel = isMarket ? 'Track this Market' : 'Track this Property'

  if (!isSignedIn) {
    return (
      <button
        onClick={() => router.push(`/login?returnTo=${encodeURIComponent(returnTo)}`)}
        className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
      >
        <BookmarkIcon filled={false} />
        {trackLabel}
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
          onClick={doRemove}
          className="text-sm text-gray-500 hover:text-red-500 transition-colors underline underline-offset-2"
        >
          Remove
        </button>
      </div>
    )
  }

  if (atLimit) {
    const limitLabel = isMarket ? 'Market limit' : 'Property limit'
    const removeLabel = isMarket ? 'a market' : 'a property'
    return (
      <p className="text-sm text-gray-500">
        {limitLabel} reached (25). Remove {removeLabel} to add {displayName}.
      </p>
    )
  }

  return (
    <button
      onClick={doSave}
      className="inline-flex items-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:border-gray-400 transition-colors"
    >
      <BookmarkIcon filled={false} />
      {trackLabel}
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
