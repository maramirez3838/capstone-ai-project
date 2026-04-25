import Link from 'next/link'

interface Props {
  propertyHref: string
  marketHref: string
  current: 'property' | 'market'
}

// Two-tab segmented switcher rendered on /property and on /market/[slug] when
// the user arrived via an address search. Uses real navigation (Link) so the
// browser back button, refresh, and URL sharing all behave correctly.
//
// Labels are intentionally market-agnostic so the switcher reads identically
// across all jurisdictions. The address itself is the user's anchor — it lives
// in PropertyHeader above this component.
export default function PropertyMarketSwitcher({
  propertyHref,
  marketHref,
  current,
}: Props) {
  const baseTab =
    'inline-flex items-center justify-center px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 focus-visible:ring-offset-2 rounded-md'
  const activeTab = 'bg-white text-gray-900 shadow-sm'
  const inactiveTab = 'text-gray-500 hover:text-gray-900'

  return (
    <nav
      role="tablist"
      aria-label="Switch between property and market view"
      className="inline-flex items-center gap-1 rounded-lg border border-gray-200 bg-gray-50 p-1"
    >
      <Link
        role="tab"
        href={propertyHref}
        aria-current={current === 'property' ? 'page' : undefined}
        aria-selected={current === 'property'}
        className={`${baseTab} ${current === 'property' ? activeTab : inactiveTab}`}
      >
        Property Requirements
      </Link>
      <Link
        role="tab"
        href={marketHref}
        aria-current={current === 'market' ? 'page' : undefined}
        aria-selected={current === 'market'}
        className={`${baseTab} ${current === 'market' ? activeTab : inactiveTab}`}
      >
        Market Requirements
      </Link>
    </nav>
  )
}
