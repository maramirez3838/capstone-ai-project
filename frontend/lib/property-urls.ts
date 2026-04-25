// URL builders for the property↔market switching spine.
//
// The /property page and the conditional switcher on /market/[slug] both need
// to construct URLs that round-trip the same address/market context. Extracting
// these here keeps the encoding consistent across SearchBar, the property page,
// and the market page, and makes the switching logic unit-testable.

export interface PropertyUrlContext {
  address: string       // normalizedAddress (Mapbox place_name)
  marketId: string
  lat: string | number
  lon: string | number
  slug: string
  marketName?: string
}

// /property?address=...&marketId=...&lat=...&lon=...&slug=...&marketName=...
//
// All five core fields are required. marketName is optional but recommended:
// it lets the switcher label the market tab without an extra fetch.
export function buildPropertyHref(ctx: PropertyUrlContext): string {
  const params = new URLSearchParams({
    address: ctx.address,
    marketId: ctx.marketId,
    lat: String(ctx.lat),
    lon: String(ctx.lon),
    slug: ctx.slug,
  })
  if (ctx.marketName) params.set('marketName', ctx.marketName)
  return `/property?${params.toString()}`
}

// /market/<slug>?from=property&address=...&marketId=...&lat=...&lon=...
//
// Used by the switcher when flipping from /property → market view. The
// `from=property` flag is the trigger for the market page to render the
// switcher; without it, the market page hides the switcher.
export function buildMarketHrefFromProperty(ctx: PropertyUrlContext): string {
  const params = new URLSearchParams({
    from: 'property',
    address: ctx.address,
    marketId: ctx.marketId,
    lat: String(ctx.lat),
    lon: String(ctx.lon),
  })
  if (ctx.marketName) params.set('marketName', ctx.marketName)
  return `/market/${encodeURIComponent(ctx.slug)}?${params.toString()}`
}

// Splits a Mapbox normalizedAddress (place_name) into street vs. location lines
// for the PropertyHeader component. Mapbox returns full addresses formatted as:
//   "1234 Ocean Way, Santa Monica, California 90405, United States"
// The first segment is the street; the rest is city/region/postal/country.
export function parseAddressForDisplay(address: string): {
  streetLine: string
  locationLine: string
} {
  const trimmed = address.trim()
  const commaIdx = trimmed.indexOf(',')
  if (commaIdx === -1) {
    return { streetLine: trimmed, locationLine: '' }
  }
  return {
    streetLine: trimmed.slice(0, commaIdx).trim(),
    locationLine: trimmed.slice(commaIdx + 1).trim(),
  }
}

