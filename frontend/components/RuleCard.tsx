import type { MarketRule } from '@/types/market'

interface Props {
  rule: MarketRule
}

export default function RuleCard({ rule }: Props) {
  return (
    <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
        {rule.label}
      </p>
      <p className="text-base font-semibold text-gray-100 mb-1">{rule.value}</p>
      {rule.details && (
        <p className="text-sm text-gray-400 leading-relaxed">{rule.details}</p>
      )}
    </div>
  )
}
