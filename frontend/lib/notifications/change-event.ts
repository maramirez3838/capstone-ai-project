// Change-event writer: persists a MarketChangeEvent row for every detected
// market refresh that produced a non-empty diff. The row's severity drives
// fan-out filtering (per-user minSeverity preference). Returns null when the
// diff is empty so the caller can short-circuit fan-out.

import { db } from '@/lib/db'
import { logEvent } from '@/lib/telemetry'
import type { MarketChangeEvent } from '@prisma/client'

export interface RuleDiff {
  added: string[]
  removed: string[]
  changed: Array<{ ruleKey: string; field: string; from: string; to: string }>
}

export type ChangeSeverity = 'high' | 'medium' | 'low'

// Map severity → numeric rank for "minSeverity" comparisons.
export function severityRank(s: string): number {
  return s === 'high' ? 3 : s === 'medium' ? 2 : 1
}

// Heuristic — start simple and tune as the agent emits richer signals.
//   high   = rules added/removed, OR top-level strStatus changed
//   medium = rule values/details changed (substantive content change)
//   low    = only codeRef / codeUrl changed (citation-only update)
export function classifyChangeSeverity(diff: RuleDiff, statusChanged: boolean): ChangeSeverity {
  if (statusChanged) return 'high'
  if (diff.added.length > 0 || diff.removed.length > 0) return 'high'

  const hasSubstantiveEdit = diff.changed.some(
    (c) => c.field === 'value' || c.field === 'details'
  )
  if (hasSubstantiveEdit) return 'medium'

  return 'low'
}

export function isEmptyDiff(diff: RuleDiff): boolean {
  return diff.added.length === 0 && diff.removed.length === 0 && diff.changed.length === 0
}

interface WriteChangeEventArgs {
  marketId: string
  rulesVersionFrom: string | null
  rulesVersionTo: string
  diff: RuleDiff
  statusChanged: boolean
}

export async function writeChangeEvent(
  args: WriteChangeEventArgs
): Promise<MarketChangeEvent | null> {
  if (isEmptyDiff(args.diff) && !args.statusChanged) return null

  const severity = classifyChangeSeverity(args.diff, args.statusChanged)

  const event = await db.marketChangeEvent.create({
    data: {
      marketId: args.marketId,
      rulesVersionFrom: args.rulesVersionFrom,
      rulesVersionTo: args.rulesVersionTo,
      changeSummary: args.diff as unknown as object,
      severity,
    },
  })

  logEvent('change_event_written', {
    metadata: { marketId: args.marketId, severity, eventId: event.id },
  })

  return event
}
