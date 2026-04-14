import type {
  StrStatus,
  PermitRequired,
  OwnerOccupancy,
  FreshnessStatus,
} from '@/types/market'

export function formatStrStatus(status: StrStatus): string {
  switch (status) {
    case 'allowed':
      return 'STR Eligible'
    case 'conditional':
      return 'STR Eligible with Restrictions'
    case 'not_allowed':
      return 'STR Not Eligible'
  }
}

export const strStatusTooltip: Record<StrStatus, string> = {
  allowed: 'STRs are permitted in this market with minimal restrictions.',
  conditional:
    'STRs are permitted but subject to specific requirements — such as permits, owner-occupancy rules, or nightly caps. Review the rules below.',
  not_allowed: 'STRs are generally prohibited in this market under current local regulations.',
}

export function formatPermitRequired(value: PermitRequired): string {
  switch (value) {
    case 'yes':
      return 'Required'
    case 'no':
      return 'Not Required'
    case 'varies':
      return 'Varies'
  }
}

export function formatOwnerOccupancy(value: OwnerOccupancy): string {
  switch (value) {
    case 'yes':
      return 'Required'
    case 'no':
      return 'Not Required'
    case 'varies':
      return 'Varies'
  }
}

export function formatFreshnessStatus(status: FreshnessStatus): string {
  switch (status) {
    case 'fresh':
      return 'Current'
    case 'review_due':
      return 'Review Recommended'
    case 'needs_review':
      return 'Verify Before Acting'
  }
}

export function formatLastReviewed(isoDate: string): string {
  const date = new Date(isoDate)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
