// Mapbox Geocoding API v5 wrapper.
// Used server-side by /api/search to resolve an address to coordinates + jurisdiction.
// Results are cached in the Property table — call this only on cache miss.

export interface GeocodedAddress {
  normalizedAddress: string  // Mapbox place_name — used as the Property cache key
  latitude: number
  longitude: number
  city: string | null
  stateCode: string | null   // 2-letter code, e.g. "CA"
  countyName: string | null
  postalCode: string | null
}

export class GeocodingError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GeocodingError'
  }
}

interface MapboxContext {
  id: string
  text: string
  short_code?: string
}

interface MapboxFeature {
  place_name: string
  center: [number, number]  // [longitude, latitude]
  context?: MapboxContext[]
}

interface MapboxGeocodingResponse {
  features: MapboxFeature[]
}

export async function geocodeAddress(address: string): Promise<GeocodedAddress> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) {
    throw new GeocodingError('NEXT_PUBLIC_MAPBOX_TOKEN is not configured')
  }

  const encoded = encodeURIComponent(address)
  const url =
    `https://api.mapbox.com/geocoding/v5/mapbox.places/${encoded}.json` +
    `?access_token=${token}&types=address&country=US&limit=1`

  let response: Response
  try {
    response = await fetch(url)
  } catch (err) {
    throw new GeocodingError(`Mapbox request failed: ${String(err)}`)
  }

  if (!response.ok) {
    throw new GeocodingError(`Mapbox returned ${response.status}`)
  }

  const data: MapboxGeocodingResponse = await response.json()

  if (!data.features?.length) {
    throw new GeocodingError('No geocoding results for this address')
  }

  const feature = data.features[0]
  const context: MapboxContext[] = feature.context ?? []

  const city = context.find((c) => c.id.startsWith('place.'))?.text ?? null
  const countyName = context.find((c) => c.id.startsWith('district.'))?.text ?? null
  const regionShortCode = context.find((c) => c.id.startsWith('region.'))?.short_code ?? null
  // Mapbox returns short_code as "US-CA"; strip the "US-" prefix
  const stateCode = regionShortCode ? regionShortCode.replace(/^US-/, '') : null
  const postalCode = context.find((c) => c.id.startsWith('postcode.'))?.text ?? null

  return {
    normalizedAddress: feature.place_name,
    latitude: feature.center[1],
    longitude: feature.center[0],
    city,
    stateCode,
    countyName,
    postalCode,
  }
}

// Returns true if the query looks like a street address (starts with a house number).
// Used by /api/search to decide which resolution path to take.
export function isAddressQuery(query: string): boolean {
  return /^\d+\s+\w/.test(query.trim())
}
