import { describe, it, expect } from 'vitest'
import { computeMarketRulesVersion } from '@/lib/market-rules-version'

const baseInput = {
  strStatus: 'conditional',
  permitRequired: 'yes',
  ownerOccupancyRequired: 'no',
  rules: [
    { ruleKey: 'permit_required', value: 'Yes — STR-1 license' },
    { ruleKey: 'nightly_cap', value: '30 nights/year', applicableTo: 'str_full' },
    { ruleKey: 'tot_rate', value: '14% TOT', codeRef: 'SMMC § 6.20.050' },
  ],
}

describe('computeMarketRulesVersion', () => {
  it('is deterministic — same input produces same hash', () => {
    const a = computeMarketRulesVersion(baseInput)
    const b = computeMarketRulesVersion(baseInput)
    expect(a).toBe(b)
    expect(a).toHaveLength(16)
  })

  it('is order-independent across rules', () => {
    const reordered = {
      ...baseInput,
      rules: [...baseInput.rules].reverse(),
    }
    expect(computeMarketRulesVersion(reordered)).toBe(computeMarketRulesVersion(baseInput))
  })

  it('changes when a rule value changes', () => {
    const modified = {
      ...baseInput,
      rules: baseInput.rules.map((r) =>
        r.ruleKey === 'nightly_cap' ? { ...r, value: '60 nights/year' } : r
      ),
    }
    expect(computeMarketRulesVersion(modified)).not.toBe(computeMarketRulesVersion(baseInput))
  })

  it('changes when a rule is added', () => {
    const withAddition = {
      ...baseInput,
      rules: [...baseInput.rules, { ruleKey: 'fire_inspection', value: 'Required annually' }],
    }
    expect(computeMarketRulesVersion(withAddition)).not.toBe(computeMarketRulesVersion(baseInput))
  })

  it('changes when strStatus changes', () => {
    const allowed = { ...baseInput, strStatus: 'allowed' }
    expect(computeMarketRulesVersion(allowed)).not.toBe(computeMarketRulesVersion(baseInput))
  })

  it('treats null/undefined optional fields equivalently', () => {
    const withNulls = {
      ...baseInput,
      rules: baseInput.rules.map((r) => ({
        ...r,
        details: null,
        codeRef: r.codeRef ?? null,
        applicableTo: r.applicableTo ?? null,
        jurisdictionLevel: null,
      })),
    }
    const withUndef = {
      ...baseInput,
      rules: baseInput.rules.map((r) => ({
        ruleKey: r.ruleKey,
        value: r.value,
        codeRef: r.codeRef,
        applicableTo: r.applicableTo,
      })),
    }
    expect(computeMarketRulesVersion(withNulls)).toBe(computeMarketRulesVersion(withUndef))
  })

  it('produces a valid hash for an empty rules array', () => {
    const empty = { ...baseInput, rules: [] }
    const v = computeMarketRulesVersion(empty)
    expect(v).toMatch(/^[a-f0-9]{16}$/)
  })
})
