'use client'

import { useEffect } from 'react'
import { logEvent } from '@/lib/telemetry'

interface Props {
  marketSlug: string
  // 'property' = arrived via the property/market switcher; 'direct' = arrived
  // by direct navigation, search, or watchlist click. Used for analytics so we
  // can tell which views were spawned from address-resolved searches.
  source: 'property' | 'direct'
}

// Fires result_viewed on mount with a view='market' discriminator. The market
// page is a server component so we wrap a small client component for the
// browser-only telemetry call.
export default function MarketViewLogger({ marketSlug, source }: Props) {
  useEffect(() => {
    logEvent('result_viewed', {
      marketSlug,
      metadata: { view: 'market', source },
    })
  }, [marketSlug, source])

  return null
}
