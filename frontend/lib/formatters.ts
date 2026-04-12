import type {
  StrStatus,
  PermitRequired,
  OwnerOccupancy,
  FreshnessStatus,
} from '@/types/market'

export function formatStrStatus(status: StrStatus): string {
  switch (status) {
    case 'allowed':
      return 'Allowed'
    case 'conditional':
      return 'Conditional'
    case 'not_allowed':
      return 'Not Allowed'
  }
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
      return 'Up to Date'
    case 'review_due':
      return 'Review Due'
    case 'needs_review':
      return 'Needs Review'
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
