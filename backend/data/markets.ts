// Canonical market seed data for STR Comply
//
// IMPORTANT: This file is the initial seed state.
// Agent-applied changes in production are NOT automatically reflected here.
// Before reseeding, run: npx tsx scripts/export-seed-state.ts > ../backend/data/markets.ts
// Review the git diff carefully before reseeding from this file.
//
// This file is the single source of truth for market content.
// It lives in /backend/data/ so data authoring stays separate from
// framework code — add new markets here, not in /frontend/mocks/.
//
// The seed script at /frontend/prisma/seed.ts imports from this file.
//
// Shape notes:
// - `aliases` is a flat string[] here; seed.ts writes each to MarketAlias table
// - `rules[].codeRef` and `rules[].codeUrl` are included here and written to MarketRule
// - All string enums must match the values documented in schema.prisma

export interface SeedRule {
  ruleKey: string
  label: string
  value: string
  details?: string
  codeRef?: string
  codeUrl?: string
  displayOrder: number
  jurisdictionLevel?: 'city' | 'county' | 'state'
  linkedSourceTypes?: string[]  // sourceType values of sources that back this rule (seed-only, not stored in DB)
}

export interface SeedSource {
  title: string
  url: string
  sourceType: 'official_program_page' | 'municipal_code' | 'tax_registration' | 'city_ordinance' | 'other'
  publisher?: string
  displayOrder: number
}

export interface SeedMarket {
  slug: string
  name: string
  stateCode: string
  countyName?: string
  regionLabel?: string
  strStatus: 'allowed' | 'conditional' | 'not_allowed'
  permitRequired: 'yes' | 'no' | 'varies'
  ownerOccupancyRequired: 'yes' | 'no' | 'varies'
  freshnessStatus: 'fresh' | 'review_due' | 'needs_review'
  supportStatus: 'supported' | 'unsupported' | 'archived'
  summary: string
  notableRestrictions?: string
  lastReviewedAt: string // ISO 8601
  aliases: string[]
  rules: SeedRule[]
  sources: SeedSource[]
}

export const markets: SeedMarket[] = [
  // ---------------------------------------------------------------------------
  // Santa Monica
  // ---------------------------------------------------------------------------
  {
    slug: 'santa-monica',
    name: 'Santa Monica',
    stateCode: 'CA',
    countyName: 'Los Angeles County',
    regionLabel: 'Westside LA',
    strStatus: 'conditional',
    permitRequired: 'yes',
    ownerOccupancyRequired: 'yes',
    freshnessStatus: 'fresh',
    supportStatus: 'supported',
    summary:
      'Home-Sharing Program tied to primary residency only. Unhosted rentals capped at 30 nights/year; hosted stays uncapped. City registration required. Transient Occupancy Tax enforced. Hosts must display their registration number on all listings. Failure to register or exceed the nightly cap can result in fines and permit revocation. The program is actively enforced through platform data-sharing agreements with major STR platforms.',
    notableRestrictions:
      'Primary residence requirement strictly enforced. 30-night annual cap for unhosted stays.',
    lastReviewedAt: '2026-03-15T00:00:00.000Z',
    aliases: ['santa monica', 'sm', 'smc', 'santa monica ca'],
    rules: [
      {
        ruleKey: 'str_status',
        label: 'STR Eligibility',
        value: 'Conditional',
        details: 'Allowed under Home-Sharing Program for primary residences only.',
        displayOrder: 1,
        codeRef: 'SMMC § 6.20.010',
        codeUrl: 'https://ecode360.com/42735096',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page', 'municipal_code'],
      },
      {
        ruleKey: 'permit_required',
        label: 'Permit / Registration',
        value: 'Required',
        details: 'City registration and business license required before listing. Annual renewal.',
        displayOrder: 2,
        codeRef: 'SMMC § 6.20.030',
        codeUrl: 'https://ecode360.com/42735096',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page', 'municipal_code'],
      },
      {
        ruleKey: 'owner_occupancy',
        label: 'Owner Occupancy',
        value: 'Required',
        details: 'Primary residence requirement — must be your main home.',
        displayOrder: 3,
        codeRef: 'SMMC § 6.20.020',
        codeUrl: 'https://ecode360.com/42735096',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page', 'municipal_code'],
      },
      {
        ruleKey: 'nightly_cap',
        label: 'Nightly Cap',
        value: '30 nights/year (unhosted)',
        details: 'Unhosted stays limited to 30 nights/year total. Hosted stays (host present) are uncapped.',
        displayOrder: 4,
        codeRef: 'SMMC § 6.20.050',
        codeUrl: 'https://ecode360.com/42735096',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page', 'municipal_code'],
      },
    ],
    sources: [
      {
        title: 'Home-Sharing Program — City of Santa Monica',
        url: 'https://www.santamonica.gov/process-explainers/how-to-apply-for-a-home-share-business-license',
        sourceType: 'official_program_page',
        publisher: 'City of Santa Monica',
        displayOrder: 1,
      },
      {
        title: 'Santa Monica Municipal Code',
        url: 'https://ecode360.com/SA5008',
        sourceType: 'municipal_code',
        publisher: 'City of Santa Monica',
        displayOrder: 2,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Los Angeles (City)
  // ---------------------------------------------------------------------------
  {
    slug: 'los-angeles',
    name: 'Los Angeles',
    stateCode: 'CA',
    countyName: 'Los Angeles County',
    regionLabel: 'City of LA',
    strStatus: 'conditional',
    permitRequired: 'yes',
    ownerOccupancyRequired: 'yes',
    freshnessStatus: 'fresh',
    supportStatus: 'supported',
    summary:
      'Home-Sharing Ordinance (Ord. 185,931) governs STRs in the City of LA. Primary residence only — your main home. Unhosted rentals capped at 120 nights per year; hosted stays are uncapped. City Home-Sharing registration required with annual renewal. Transient Occupancy Tax collection is mandatory and must be remitted quarterly. Platforms are required to share host data with the city. Investment properties and non-primary residences are not eligible.',
    notableRestrictions:
      'Primary residence only. 120-night annual cap for unhosted stays. TOT collection required.',
    lastReviewedAt: '2026-03-20T00:00:00.000Z',
    aliases: ['los angeles', 'la', 'city of la', 'city of los angeles', 'los angeles ca'],
    rules: [
      {
        ruleKey: 'str_status',
        label: 'STR Eligibility',
        value: 'Conditional',
        details: 'Permitted under Ordinance 185,931 for primary residences only. Investment properties are excluded.',
        displayOrder: 1,
        codeRef: 'LAMC § 12.22 A.33',
        codeUrl: 'https://codelibrary.amlegal.com/codes/los_angeles/latest/lamc/0-0-0-422835',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page', 'city_ordinance'],
      },
      {
        ruleKey: 'permit_required',
        label: 'Permit / Registration',
        value: 'Required',
        details: 'City Home-Sharing registration required. Annual renewal. Number must appear on all listings.',
        displayOrder: 2,
        codeRef: 'Ordinance No. 185,931',
        codeUrl: 'https://clkrep.lacity.org/onlinedocs/2014/14-1635-s2_ord_185931_1-12-18.pdf',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page', 'city_ordinance'],
      },
      {
        ruleKey: 'owner_occupancy',
        label: 'Owner Occupancy',
        value: 'Required',
        details: 'Must be your primary residence (principal place of residence).',
        displayOrder: 3,
        codeRef: 'LAMC § 12.22 A.33(f)',
        codeUrl: 'https://codelibrary.amlegal.com/codes/los_angeles/latest/lamc/0-0-0-422835',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page', 'city_ordinance'],
      },
      {
        ruleKey: 'nightly_cap',
        label: 'Nightly Cap',
        value: '120 nights/year (unhosted)',
        details: '120 nights/year maximum for unhosted stays. No cap for hosted stays (host present on property).',
        displayOrder: 4,
        codeRef: 'LAMC § 12.22 A.33(g)',
        codeUrl: 'https://codelibrary.amlegal.com/codes/los_angeles/latest/lamc/0-0-0-422835',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page', 'city_ordinance'],
      },
    ],
    sources: [
      {
        title: 'Home-Sharing Ordinance — City of Los Angeles',
        url: 'https://housing.lacity.gov/residents/short-term-rentals',
        sourceType: 'official_program_page',
        publisher: 'City of Los Angeles Housing Department',
        displayOrder: 1,
      },
      {
        title: 'Los Angeles Municipal Code',
        url: 'https://codelibrary.amlegal.com/codes/los_angeles/latest/lamc/0-0-0-422835',
        sourceType: 'municipal_code',
        publisher: 'City of Los Angeles',
        displayOrder: 2,
      },
      {
        title: 'Ordinance No. 185,931 — Home-Sharing',
        url: 'https://clkrep.lacity.org/onlinedocs/2014/14-1635-s2_ord_185931_1-12-18.pdf',
        sourceType: 'city_ordinance',
        publisher: 'City of Los Angeles',
        displayOrder: 3,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // West Hollywood
  // ---------------------------------------------------------------------------
  {
    slug: 'west-hollywood',
    name: 'West Hollywood',
    stateCode: 'CA',
    countyName: 'Los Angeles County',
    regionLabel: 'Westside LA',
    strStatus: 'conditional',
    permitRequired: 'yes',
    ownerOccupancyRequired: 'varies',
    freshnessStatus: 'review_due',
    supportStatus: 'supported',
    summary:
      'West Hollywood maintains an active STR permit program. Primary residence is the general standard, but multi-unit properties and HOA-governed buildings may face additional restrictions or outright prohibitions depending on lease terms and HOA rules. City permit required before listing. Transient Occupancy Tax collection is mandatory. Rules have been subject to recent amendment — verify current requirements directly with the City before listing.',
    notableRestrictions:
      'Multi-unit and HOA restrictions may apply. Rules subject to amendment — verify current status.',
    lastReviewedAt: '2025-12-10T00:00:00.000Z',
    aliases: ['west hollywood', 'weho', 'west hwood', 'westhollywood'],
    rules: [
      {
        ruleKey: 'str_status',
        label: 'STR Eligibility',
        value: 'Conditional',
        details: 'Permitted with active City STR program. Multi-unit building restrictions vary by property.',
        displayOrder: 1,
        codeRef: 'WeHo Municipal Code § 19.24',
        codeUrl: 'https://ecode360.com/43904377',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page', 'municipal_code'],
      },
      {
        ruleKey: 'permit_required',
        label: 'Permit / Registration',
        value: 'Required',
        details: 'City STR permit required. Must be renewed annually.',
        displayOrder: 2,
        codeRef: 'WeHo Municipal Code § 19.24.040',
        codeUrl: 'https://ecode360.com/43904377',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page', 'municipal_code'],
      },
      {
        ruleKey: 'owner_occupancy',
        label: 'Owner Occupancy',
        value: 'Varies',
        details: 'Depends on property type, lease terms, and HOA governing documents.',
        displayOrder: 3,
        codeUrl: 'https://ecode360.com/WE5031',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page'],
      },
      {
        ruleKey: 'tot',
        label: 'Transient Occupancy Tax',
        value: 'Required',
        details: 'TOT must be collected from guests and remitted to the City.',
        displayOrder: 4,
        codeRef: 'WeHo Municipal Code § 3.28',
        codeUrl: 'https://ecode360.com/43903386',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['municipal_code'],
      },
    ],
    sources: [
      {
        title: 'Home Sharing License — City of West Hollywood',
        url: 'https://www.weho.org/city-government/city-departments/community-safety/neighborhood-and-business-safety/business-licensing-and-permits/home-sharing-license',
        sourceType: 'official_program_page',
        publisher: 'City of West Hollywood',
        displayOrder: 1,
      },
      {
        title: 'West Hollywood Municipal Code',
        url: 'https://ecode360.com/WE5031',
        sourceType: 'municipal_code',
        publisher: 'City of West Hollywood',
        displayOrder: 2,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Pasadena
  // ---------------------------------------------------------------------------
  {
    slug: 'pasadena',
    name: 'Pasadena',
    stateCode: 'CA',
    countyName: 'Los Angeles County',
    regionLabel: 'San Gabriel Valley',
    strStatus: 'not_allowed',
    permitRequired: 'no',
    ownerOccupancyRequired: 'varies',
    freshnessStatus: 'needs_review',
    supportStatus: 'supported',
    summary:
      'Most residential STR uses in Pasadena are prohibited under current zoning regulations. Investment properties intended for short-term rental are not eligible for any permit. Limited exceptions may exist for owner-occupants in specific zones, but the city has not established a formal STR permit program. The regulatory posture is restrictive. If you are considering an STR in Pasadena, verify current zoning rules directly with the Planning & Community Development department before purchasing.',
    notableRestrictions:
      'Most residential zones prohibit STR use. Investment properties not eligible.',
    lastReviewedAt: '2025-09-01T00:00:00.000Z',
    aliases: ['pasadena', 'city of pasadena', 'pasadena ca'],
    rules: [
      {
        ruleKey: 'str_status',
        label: 'STR Eligibility',
        value: 'Not Allowed',
        details: 'Residential STR use is generally not permitted under current zoning regulations.',
        displayOrder: 1,
        codeRef: 'Pasadena Zoning Code § 17.50.296',
        codeUrl: 'https://library.municode.com/ca/pasadena/codes/code_of_ordinances?nodeId=TIT17ZOCO_ART5STSPLAUS_CH17.50STSPLAUS',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page', 'municipal_code'],
      },
      {
        ruleKey: 'permit_required',
        label: 'Permit / Registration',
        value: 'No Permit Available',
        details: 'No city STR permit program exists for most residential properties.',
        displayOrder: 2,
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page'],
      },
      {
        ruleKey: 'investment_property',
        label: 'Investment Properties',
        value: 'Not Eligible',
        details: 'Non-owner-occupied investment properties cannot be used as STRs.',
        displayOrder: 3,
        codeRef: 'Pasadena Zoning Code § 17.50.296',
        codeUrl: 'https://library.municode.com/ca/pasadena/codes/code_of_ordinances?nodeId=TIT17ZOCO_ART5STSPLAUS_CH17.50STSPLAUS',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page', 'municipal_code'],
      },
    ],
    sources: [
      {
        title: 'Planning & Community Development — City of Pasadena',
        url: 'https://ww5.cityofpasadena.net/planning/',
        sourceType: 'official_program_page',
        publisher: 'City of Pasadena',
        displayOrder: 1,
      },
      {
        title: 'Pasadena Municipal Code',
        url: 'https://library.municode.com/ca/pasadena/codes/code_of_ordinances?nodeId=TIT17ZOCO_ART5STSPLAUS_CH17.50STSPLAUS',
        sourceType: 'municipal_code',
        publisher: 'City of Pasadena',
        displayOrder: 2,
      },
    ],
  },

  // ---------------------------------------------------------------------------
  // Malibu
  // ---------------------------------------------------------------------------
  {
    slug: 'malibu',
    name: 'Malibu',
    stateCode: 'CA',
    countyName: 'Los Angeles County',
    regionLabel: 'Malibu / PCH Corridor',
    strStatus: 'conditional',
    permitRequired: 'yes',
    ownerOccupancyRequired: 'no',
    freshnessStatus: 'review_due',
    supportStatus: 'supported',
    summary:
      'STRs are conditionally permitted at the city level, but Malibu presents a uniquely complex regulatory environment. The California Coastal Commission overlay applies to most properties and may impose additional use restrictions beyond what the city allows. HOA governing documents and deed restrictions are common and frequently prohibit STRs entirely. A city business license and Transient Occupancy Tax registration are required. Owner-occupancy is not required at the city level, but always verify property-specific HOA, deed, and coastal constraints before listing.',
    notableRestrictions:
      'California Coastal Commission overlay applies. HOA and deed restrictions common. Verify property-specific rules.',
    lastReviewedAt: '2026-01-05T00:00:00.000Z',
    aliases: ['malibu', 'city of malibu', 'malibu ca', 'malibu beach'],
    rules: [
      {
        ruleKey: 'str_status',
        label: 'STR Eligibility',
        value: 'Conditional',
        details: 'Permitted at city level, but subject to Coastal Commission and HOA constraints that vary by property.',
        displayOrder: 1,
        codeRef: 'Malibu Municipal Code § 17.55',
        codeUrl: 'https://ecode360.com/44339238',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page', 'municipal_code'],
      },
      {
        ruleKey: 'permit_required',
        label: 'Permit / Registration',
        value: 'Required',
        details: 'City business license and TOT registration required before listing.',
        displayOrder: 2,
        codeRef: 'Malibu Municipal Code § 17.55.010',
        codeUrl: 'https://ecode360.com/44339239',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page'],
      },
      {
        ruleKey: 'coastal_overlay',
        label: 'Coastal Commission',
        value: 'Applies',
        details: 'California Coastal Act may impose additional restrictions on use, access, and development.',
        displayOrder: 3,
        codeRef: 'Cal. Pub. Res. Code § 30210',
        codeUrl: 'https://www.malibucity.org/1070/STR-Ordinances-In-Progress',
        jurisdictionLevel: 'state',
        linkedSourceTypes: ['other'],
      },
      {
        ruleKey: 'owner_occupancy',
        label: 'Owner Occupancy',
        value: 'Not Required (City Level)',
        details: 'No city-wide owner-occupancy requirement. However, always verify HOA and deed restrictions.',
        displayOrder: 4,
        codeUrl: 'https://www.malibucity.org/820/Short-Term-Rental-Program',
        jurisdictionLevel: 'city',
        linkedSourceTypes: ['official_program_page'],
      },
    ],
    sources: [
      {
        title: 'Short-Term Rental Program — City of Malibu',
        url: 'https://www.malibucity.org/820/Short-Term-Rental-Program',
        sourceType: 'official_program_page',
        publisher: 'City of Malibu',
        displayOrder: 1,
      },
      {
        title: 'Malibu Municipal Code',
        url: 'https://ecode360.com/MA5043',
        sourceType: 'municipal_code',
        publisher: 'City of Malibu',
        displayOrder: 2,
      },
      {
        title: 'STR Ordinances In Progress — City of Malibu',
        url: 'https://www.malibucity.org/1070/STR-Ordinances-In-Progress',
        sourceType: 'other',
        publisher: 'City of Malibu',
        displayOrder: 3,
      },
    ],
  },
]
