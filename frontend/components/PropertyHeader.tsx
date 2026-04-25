import { parseAddressForDisplay } from '@/lib/property-urls'

interface Props {
  address: string
}

// Page-level header rendered above the PropertyMarketSwitcher on both /property
// and /market/[slug]?from=property. The address is the user's anchor for the
// whole property/market workflow — it stays pinned at the top regardless of
// which tab is active.
export default function PropertyHeader({ address }: Props) {
  const { streetLine, locationLine } = parseAddressForDisplay(address)

  return (
    <div className="mb-6">
      <div className="flex items-center gap-2 mb-2">
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-neutral-100 text-neutral-600">
          Resolved from search
        </span>
      </div>
      <h1 className="text-3xl font-medium text-gray-900 tracking-tight">{streetLine}</h1>
      {locationLine && <p className="text-gray-500 mt-1 text-sm">{locationLine}</p>}
    </div>
  )
}
