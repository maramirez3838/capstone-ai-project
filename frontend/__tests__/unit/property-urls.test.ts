/**
 * Tests for the property/market URL builders.
 *
 * These builders are the spine of the property↔market switching workflow —
 * they're called from SearchBar, /property page, and the market page, and
 * must keep encoding consistent so refresh, share, and back-button all work.
 */

import { describe, it, expect } from 'vitest'
import {
  buildPropertyHref,
  buildMarketHrefFromProperty,
} from '@/lib/property-urls'

const ctx = {
  address: '1234 Ocean Ave, Santa Monica, California 90401, United States',
  marketId: 'mkt_abc',
  lat: 34.0,
  lon: -118.5,
  slug: 'santa-monica',
  marketName: 'Santa Monica',
}

describe('buildPropertyHref', () => {
  it('includes all required params and marketName when provided', () => {
    const url = buildPropertyHref(ctx)
    const parsed = new URL(url, 'http://localhost')
    expect(parsed.pathname).toBe('/property')
    expect(parsed.searchParams.get('address')).toBe(ctx.address)
    expect(parsed.searchParams.get('marketId')).toBe('mkt_abc')
    expect(parsed.searchParams.get('lat')).toBe('34')
    expect(parsed.searchParams.get('lon')).toBe('-118.5')
    expect(parsed.searchParams.get('slug')).toBe('santa-monica')
    expect(parsed.searchParams.get('marketName')).toBe('Santa Monica')
  })

  it('omits marketName when undefined', () => {
    const url = buildPropertyHref({ ...ctx, marketName: undefined })
    const parsed = new URL(url, 'http://localhost')
    expect(parsed.searchParams.has('marketName')).toBe(false)
  })

  it('coerces numeric lat/lon to string', () => {
    const url = buildPropertyHref({ ...ctx, lat: 0, lon: -118 })
    const parsed = new URL(url, 'http://localhost')
    expect(parsed.searchParams.get('lat')).toBe('0')
    expect(parsed.searchParams.get('lon')).toBe('-118')
  })

  it('round-trips an address with commas and special characters', () => {
    const tricky = "1 O'Hara Lane, San José, CA 95110, USA"
    const url = buildPropertyHref({ ...ctx, address: tricky })
    const parsed = new URL(url, 'http://localhost')
    expect(parsed.searchParams.get('address')).toBe(tricky)
  })
})

describe('buildMarketHrefFromProperty', () => {
  it('targets /market/<slug> with from=property and full property context', () => {
    const url = buildMarketHrefFromProperty(ctx)
    const parsed = new URL(url, 'http://localhost')
    expect(parsed.pathname).toBe('/market/santa-monica')
    expect(parsed.searchParams.get('from')).toBe('property')
    expect(parsed.searchParams.get('address')).toBe(ctx.address)
    expect(parsed.searchParams.get('marketId')).toBe('mkt_abc')
    expect(parsed.searchParams.get('lat')).toBe('34')
    expect(parsed.searchParams.get('lon')).toBe('-118.5')
    expect(parsed.searchParams.get('marketName')).toBe('Santa Monica')
  })

  it('does not include slug as a query param (it lives in the path)', () => {
    const url = buildMarketHrefFromProperty(ctx)
    const parsed = new URL(url, 'http://localhost')
    expect(parsed.searchParams.has('slug')).toBe(false)
  })

  it('encodes slugs that contain special characters', () => {
    const url = buildMarketHrefFromProperty({ ...ctx, slug: 'west hollywood' })
    expect(url.startsWith('/market/west%20hollywood?')).toBe(true)
  })
})

describe('round-trip — property→market→property preserves context', () => {
  it('parsing the market href yields the same context that built it', () => {
    const marketUrl = buildMarketHrefFromProperty(ctx)
    const parsed = new URL(marketUrl, 'http://localhost')

    // Reconstruct what the market page would extract from searchParams
    const slugFromPath = parsed.pathname.replace(/^\/market\//, '')
    const reconstructed = {
      address: parsed.searchParams.get('address')!,
      marketId: parsed.searchParams.get('marketId')!,
      lat: parsed.searchParams.get('lat')!,
      lon: parsed.searchParams.get('lon')!,
      slug: decodeURIComponent(slugFromPath),
      marketName: parsed.searchParams.get('marketName') ?? undefined,
    }

    const propertyUrl = buildPropertyHref(reconstructed)
    const propertyParsed = new URL(propertyUrl, 'http://localhost')
    expect(propertyParsed.searchParams.get('address')).toBe(ctx.address)
    expect(propertyParsed.searchParams.get('marketId')).toBe(ctx.marketId)
    expect(propertyParsed.searchParams.get('slug')).toBe(ctx.slug)
    expect(propertyParsed.searchParams.get('marketName')).toBe(ctx.marketName)
  })
})
