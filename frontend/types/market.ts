// Shared domain types — these are the API contract stubs for the BE engineer.
// When the backend is wired, every API response must match these shapes exactly.

export type StrStatus = 'allowed' | 'conditional' | 'not_allowed'
export type PermitRequired = 'yes' | 'no' | 'varies'
export type OwnerOccupancy = 'yes' | 'no' | 'varies'
export type FreshnessStatus = 'fresh' | 'review_due' | 'needs_review'

export interface MarketRule {
  ruleKey: string
  label: string
  value: string
  details?: string
  displayOrder?: number
  codeRef?: string   // e.g. "SMMC § 6.20.010"
  codeUrl?: string   // link to the cited code section, if available
  jurisdictionLevel?: 'city' | 'county' | 'state'  // which level of government mandates this rule
  sources?: MarketSource[]  // source documents explicitly linked to this rule via join table
}

export interface MarketSource {
  id?: string
  title: string
  url: string
  sourceType: 'official_program_page' | 'municipal_code' | 'tax_registration' | 'city_ordinance' | 'other'
  publisher?: string
  displayOrder?: number
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

export interface SearchResult {
  type: 'supported'
  market: Pick<Market, 'id' | 'slug' | 'name' | 'strStatus'>
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
