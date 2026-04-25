'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PropertyMarketSwitcher from '@/components/PropertyMarketSwitcher'
import PropertyHeader from '@/components/PropertyHeader'
import PropertyRequirementsList from '@/components/PropertyRequirementsList'
import ConfidenceCallout from '@/components/ConfidenceCallout'
import Disclaimer from '@/components/Disclaimer'
import WatchlistButton from '@/components/WatchlistButton'
import { logEvent } from '@/lib/telemetry'
import { buildPropertyHref, buildMarketHrefFromProperty } from '@/lib/property-urls'
import type { PropertyRequirementsResponse } from '@/types/market'

type LifecycleState =
  | { kind: 'loading' }
  | { kind: 'ready'; data: PropertyRequirementsResponse }
  | { kind: 'error_503' }
  | { kind: 'error_404' }
  | { kind: 'error_500' }

export default function PropertyContent() {
  const router = useRouter()
  const params = useSearchParams()

  const address = params.get('address')
  const marketId = params.get('marketId')
  const lat = params.get('lat')
  const lon = params.get('lon')
  const slug = params.get('slug')
  const marketName = params.get('marketName')

  const [state, setState] = useState<LifecycleState>({ kind: 'loading' })

  // If any required URL param is missing, the page can't render — bounce home.
  useEffect(() => {
    if (!address || !marketId || !lat || !lon || !slug) {
      router.replace('/')
    }
  }, [address, marketId, lat, lon, slug, router])

  useEffect(() => {
    if (!address || !marketId || !lat || !lon) return

    let cancelled = false
    setState({ kind: 'loading' })

    const url =
      `/api/property/requirements?address=${encodeURIComponent(address)}` +
      `&marketId=${encodeURIComponent(marketId)}` +
      `&lat=${encodeURIComponent(lat)}` +
      `&lon=${encodeURIComponent(lon)}`

    fetch(url)
      .then(async (res) => {
        if (cancelled) return
        if (res.status === 503) return setState({ kind: 'error_503' })
        if (res.status === 404) return setState({ kind: 'error_404' })
        if (!res.ok) return setState({ kind: 'error_500' })
        const data = (await res.json()) as PropertyRequirementsResponse
        setState({ kind: 'ready', data })
        logEvent('result_viewed', {
          marketSlug: slug ?? undefined,
          metadata: { view: 'property', address },
        })
      })
      .catch(() => {
        if (!cancelled) setState({ kind: 'error_500' })
      })

    return () => {
      cancelled = true
    }
  }, [address, marketId, lat, lon, slug])

  if (!address || !marketId || !lat || !lon || !slug) {
    return <div className="max-w-4xl mx-auto px-6 py-10" aria-hidden="true" />
  }

  const ctx = {
    address,
    marketId,
    lat,
    lon,
    slug,
    marketName: marketName ?? undefined,
  }
  const propertyHref = buildPropertyHref(ctx)
  const marketHref = buildMarketHrefFromProperty(ctx)

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-900 transition-colors mb-8 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
        Back to search
      </Link>

      <PropertyHeader address={address} />

      <div className="mb-6">
        <PropertyMarketSwitcher
          propertyHref={propertyHref}
          marketHref={marketHref}
          current="property"
        />
      </div>

      {state.kind === 'loading' && <LoadingSkeleton />}

      {state.kind === 'ready' && (
        <>
          <div className="mb-6">
            <ConfidenceCallout
              note={
                state.data.confidenceNote ??
                'No confidence note returned. Verify all items against the source documents.'
              }
              reviewFlags={state.data.reviewFlags ?? []}
            />
          </div>

          <div>
            <h2 className="text-base font-medium text-gray-900 mb-4">
              Property-level requirements
            </h2>
            <PropertyRequirementsList requirements={state.data.requirements ?? []} />
          </div>

          {/* Watchlist — only when requirements loaded; saving a property
              we couldn't analyze would be confusing. */}
          <div className="mt-6">
            <WatchlistButton
              kind="property"
              propertyAddress={address}
              propertyDisplay={address}
              returnTo={propertyHref}
            />
          </div>
        </>
      )}

      {state.kind === 'error_503' && (
        <ErrorPanel
          title="Property analysis temporarily unavailable"
          body="The property requirements service is offline. You can still review the market-wide rules below."
          ctaLabel="View market rules instead"
          ctaHref={marketHref}
        />
      )}

      {state.kind === 'error_404' && (
        <ErrorPanel
          title="This property isn't cached yet"
          body="Run the address search again from the home page to cache it, then return here."
          ctaLabel="Back to search"
          ctaHref="/"
        />
      )}

      {state.kind === 'error_500' && (
        <ErrorPanel
          title="Something went wrong"
          body="The requirements lookup failed. Try again, or fall back to the market view."
          ctaLabel="View market rules instead"
          ctaHref={marketHref}
        />
      )}

      <div className="mt-10 pt-8 border-t border-gray-100">
        <Disclaimer />
      </div>
    </div>
  )
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse" aria-hidden="true">
      <div className="h-20 rounded-xl bg-neutral-100" />
      <div className="h-32 rounded-2xl bg-neutral-100" />
      <div className="h-32 rounded-2xl bg-neutral-100" />
    </div>
  )
}

interface ErrorPanelProps {
  title: string
  body: string
  ctaLabel: string
  ctaHref: string
}

function ErrorPanel({ title, body, ctaLabel, ctaHref }: ErrorPanelProps) {
  return (
    <div
      role="alert"
      className="rounded-2xl border border-neutral-200 bg-neutral-50 px-5 py-6"
    >
      <h2 className="text-base font-medium text-gray-900">{title}</h2>
      <p className="mt-2 text-sm text-gray-600 leading-relaxed">{body}</p>
      <Link
        href={ctaHref}
        className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-accent-700 hover:text-accent-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 rounded"
      >
        {ctaLabel}
        <svg
          aria-hidden="true"
          focusable="false"
          xmlns="http://www.w3.org/2000/svg"
          className="h-4 w-4"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </Link>
    </div>
  )
}
