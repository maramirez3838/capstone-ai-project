// Shared domain types — these are the API contract stubs for the BE engineer.
// When the backend is wired, every API response must match these shapes exactly.

export type StrStatus = 'allowed' | 'conditional' | 'not_allowed'
export type PermitRequired = 'yes' | 'no' | 'varies'
export type OwnerOccupancy = 'yes' | 'no' | 'varies'
export type FreshnessStatus = 'fresh' | 'review_due' | 'needs_review'
// Property-level requirement strength — emitted by the property requirements agent.
// Distinct from StrStatus: a single property can have many requirements at varying levels.
export type RequirementLevel = 'required' | 'conditional' | 'informational'

// Per-property compliance requirement returned by GET /api/property/requirements.
// Mirrors the agent's PropertyRequirement output.
export interface PropertyRequirement {
  ruleKey: string
  label: string
  value: string
  details?: string
  codeRef?: string
  codeUrl?: string
  requirementLevel: RequirementLevel
}

export interface PropertyRequirementsResponse {
  address: string
  marketId: string
  requirements: PropertyRequirement[]
  confidenceNote: string
  reviewFlags: string[]
  disclaimerRequired: true
}

export interface MarketRule {
  ruleKey: string
  label: string
  value: string
  details?: string
  displayOrder?: number
  codeRef?: string   // e.g. "SMMC § 6.20.010"
  codeUrl?: string   // link to the cited code section, if available
  jurisdictionLevel?: 'city' | 'county' | 'state'  // which level of government mandates this rule
  // "str_full" | "home_sharing" | "both" — used by the STR type toggle to filter displayed rules
  applicableTo?: 'str_full' | 'home_sharing' | 'both'
  sources?: MarketSource[]  // source documents explicitly linked to this rule via join table
}

export interface MarketSource {
  id?: string
  title: string
  url: string
  sourceType: 'official_program_page' | 'municipal_code' | 'tax_registration' | 'city_ordinance' | 'other'
  publisher?: string
  displayOrder?: number
  // "active" | "broken" | "pending_review" | "replaced" — set by compliance monitor
  sourceStatus?: string
}

export interface Market {
  id: string
  slug: string
  name: string
  stateCode: string
  countyName: string
  regionLabel?: string
  strStatus: StrStatus
  permitRequired: PermitRequired
  ownerOccupancyRequired: OwnerOccupancy
  summary: string
  notableRestrictions?: string
  lastReviewedAt: string   // ISO 8601 date string
  freshnessStatus: FreshnessStatus
  rules: MarketRule[]
  sources: MarketSource[]
  aliases: string[]        // used for search matching only; not stored on the BE Market model
}

// ─── API response shapes (BE contract reference) ────────────────────────────

// Property context attached to address-resolved search hits so the UI can
// route to /property and render per-address requirements without re-geocoding.
export interface SearchResultProperty {
  address: string             // normalizedAddress (Mapbox place_name) — Property cache key
  latitude: number
  longitude: number
  city: string | null
  countyName: string | null
}

export interface SearchResult {
  type: 'supported'
  // 'address' = query was geocoded and resolved to a market via city/county.
  // 'market'  = query matched a market slug, alias, or name directly.
  // The UI uses this to decide whether to land on /property or /market/[slug].
  resolution: 'address' | 'market'
  market: Pick<Market, 'id' | 'slug' | 'name' | 'strStatus'>
  property?: SearchResultProperty   // present iff resolution === 'address'
  redirectUrl: string
}

export interface UnsupportedResult {
  type: 'unsupported'
  normalizedQuery: string
}

export type SearchResponse = SearchResult | UnsupportedResult

// Watchlist item as returned by GET /api/watchlist
export interface WatchlistEntry {
  marketSlug: string
  savedAt: string // ISO 8601
}

// Geocoded address cache entry (shared across all users)
export interface Property {
  id: string
  address: string        // normalized Mapbox place_name — canonical cache key
  latitude: number
  longitude: number
  city: string | null
  stateCode: string | null
  countyName: string | null
  postalCode: string | null
  marketId: string | null  // null = address is in an unsupported jurisdiction
}
