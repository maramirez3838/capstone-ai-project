import type { Market } from '@/types/market'
import StatusBadge from './StatusBadge'
import { formatPermitRequired, formatOwnerOccupancy } from '@/lib/formatters'

interface Props {
  market: Market
}

const cardBorder: Record<Market['strStatus'], string> = {
  allowed: 'border-l-green-500',
  conditional: 'border-l-amber-500',
  not_allowed: 'border-l-red-500',
}

export default function ComplianceSummaryCard({ market }: Props) {
  return (
    <div
      className={`rounded-xl border border-gray-800 bg-gray-900 border-l-4 ${cardBorder[market.strStatus]} p-6`}
    >
      {/* Status row */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        <StatusBadge status={market.strStatus} size="lg" />

        <div className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300 border border-gray-700">
          <span className="text-gray-500">Permit</span>
          <span className="font-medium">{formatPermitRequired(market.permitRequired)}</span>
        </div>

        <div className="flex items-center gap-1.5 rounded-full bg-gray-800 px-3 py-1 text-sm text-gray-300 border border-gray-700">
          <span className="text-gray-500">Owner-Occupied</span>
          <span className="font-medium">{formatOwnerOccupancy(market.ownerOccupancyRequired)}</span>
        </div>
      </div>

      {/* Summary */}
      <p className="text-gray-300 leading-relaxed text-[15px]">{market.summary}</p>

      {/* Notable restrictions */}
      {market.notableRestrictions && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          <p className="text-sm text-gray-500">
            <span className="font-semibold text-gray-400">Notable: </span>
            {market.notableRestrictions}
          </p>
        </div>
      )}
    </div>
  )
}
