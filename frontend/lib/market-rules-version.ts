// Computes a stable hash representing a market's compliance rules + status.
// Used as the invalidation key for cached property requirements: when the
// version changes, all cached PropertyRequirements rows in that market are
// considered stale and the agent runs again on next access.
//
// Deterministic and order-independent — sorting rules by ruleKey before
// hashing means the same rule set always produces the same version regardless
// of insert order in the DB.

import { createHash } from 'crypto'

export interface MarketRulesVersionInput {
  strStatus: string
  permitRequired: string
  ownerOccupancyRequired: string
  rules: Array<{
    ruleKey: string
    value: string
    details?: string | null
    codeRef?: string | null
    applicableTo?: string | null
    jurisdictionLevel?: string | null
  }>
}

export function computeMarketRulesVersion(input: MarketRulesVersionInput): string {
  const sortedRules = [...input.rules].sort((a, b) => a.ruleKey.localeCompare(b.ruleKey))

  const canonical = {
    strStatus: input.strStatus,
    permitRequired: input.permitRequired,
    ownerOccupancyRequired: input.ownerOccupancyRequired,
    rules: sortedRules.map((r) => ({
      ruleKey: r.ruleKey,
      value: r.value,
      details: r.details ?? null,
      codeRef: r.codeRef ?? null,
      applicableTo: r.applicableTo ?? 'both',
      jurisdictionLevel: r.jurisdictionLevel ?? null,
    })),
  }

  // Truncated SHA-256 (16 hex chars = 64 bits). Plenty of entropy to make
  // collisions astronomically unlikely across the small market set, while
  // keeping the column compact.
  return createHash('sha256').update(JSON.stringify(canonical)).digest('hex').slice(0, 16)
}
