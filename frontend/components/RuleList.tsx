'use client'

import { useState, useEffect } from 'react'
import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import type { MarketRule, MarketSource } from '@/types/market'
import RuleCard from '@/components/RuleCard'

type RuleType = 'str_full' | 'home_sharing'

interface Props {
  rules: MarketRule[]
  lastReviewedAt: string
  allSources: MarketSource[]
}

export default function RuleList({ rules, lastReviewedAt, allSources }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const initialType = (searchParams.get('type') as RuleType) === 'home_sharing'
    ? 'home_sharing'
    : 'str_full'

  const [ruleType, setRuleType] = useState<RuleType>(initialType)

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString())
    if (ruleType === 'str_full') {
      params.delete('type')
    } else {
      params.set('type', ruleType)
    }
    const query = params.toString()
    router.replace(`${pathname}${query ? `?${query}` : ''}`, { scroll: false })
  }, [ruleType]) // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = rules.filter((r) => {
    const t = r.applicableTo ?? 'both'
    return t === 'both' || t === ruleType
  })

  return (
    <div>
      {/* STR type toggle */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-medium text-gray-900">Rule Breakdown</h2>
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
          <ToggleButton
            active={ruleType === 'str_full'}
            onClick={() => setRuleType('str_full')}
            label="Full STR"
          />
          <ToggleButton
            active={ruleType === 'home_sharing'}
            onClick={() => setRuleType('home_sharing')}
            label="Home Sharing"
          />
        </div>
      </div>

      {ruleType === 'home_sharing' && (
        <p className="text-xs text-gray-500 bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 mb-4">
          Showing rules for <strong>home sharing</strong> — where you as the host are present during the guest's stay. Full STR-only rules (e.g., unhosted nightly caps) are hidden.
        </p>
      )}

      {filtered.length === 0 ? (
        <p className="text-sm text-gray-500 py-4 text-center">No rules match this rental type.</p>
      ) : (
        <div className="divide-y divide-gray-100 rounded-2xl border border-gray-100 overflow-hidden">
          {filtered.map((rule) => (
            <RuleCard
              key={rule.ruleKey}
              rule={rule}
              lastReviewedAt={lastReviewedAt}
              allSources={allSources}
            />
          ))}
        </div>
      )}

      <p className="mt-2 text-right text-xs text-gray-400">
        {filtered.length} rule{filtered.length !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

function ToggleButton({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
        active
          ? 'bg-white text-gray-900 shadow-sm'
          : 'text-gray-500 hover:text-gray-700'
      }`}
      aria-pressed={active}
    >
      {label}
    </button>
  )
}
