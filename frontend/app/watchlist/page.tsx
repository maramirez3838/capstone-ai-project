import { Suspense } from 'react'
import WatchlistContent from './WatchlistContent'

// useSearchParams (used in WatchlistContent for the ?tab= URL param) requires
// a Suspense boundary in App Router (lessons.md 2026-04-12).
export default function WatchlistPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-950">
          <div className="max-w-4xl mx-auto px-6 py-16 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-lg bg-gray-800 animate-pulse" />
            ))}
          </div>
        </div>
      }
    >
      <WatchlistContent />
    </Suspense>
  )
}
