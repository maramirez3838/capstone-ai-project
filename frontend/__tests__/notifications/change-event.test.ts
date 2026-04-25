/**
 * Tests for lib/notifications/change-event.ts
 *
 * Covers severity classification + the write/short-circuit gate.
 * db is fully mocked.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/db', () => ({
  db: {
    marketChangeEvent: { create: vi.fn() },
  },
}))

vi.mock('@/lib/telemetry', () => ({
  logEvent: vi.fn(),
}))

import {
  classifyChangeSeverity,
  isEmptyDiff,
  severityRank,
  writeChangeEvent,
  type RuleDiff,
} from '@/lib/notifications/change-event'
import { db } from '@/lib/db'

const mockDb = db as unknown as {
  marketChangeEvent: { create: ReturnType<typeof vi.fn> }
}

const emptyDiff: RuleDiff = { added: [], removed: [], changed: [] }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('severityRank', () => {
  it('orders high > medium > low', () => {
    expect(severityRank('high')).toBeGreaterThan(severityRank('medium'))
    expect(severityRank('medium')).toBeGreaterThan(severityRank('low'))
  })

  it('treats unknown values as low', () => {
    expect(severityRank('garbage')).toBe(severityRank('low'))
  })
})

describe('classifyChangeSeverity', () => {
  it('returns high when strStatus changed', () => {
    expect(classifyChangeSeverity(emptyDiff, true)).toBe('high')
  })

  it('returns high when a rule was added', () => {
    expect(
      classifyChangeSeverity({ added: ['nightly_cap'], removed: [], changed: [] }, false)
    ).toBe('high')
  })

  it('returns high when a rule was removed', () => {
    expect(
      classifyChangeSeverity({ added: [], removed: ['old_rule'], changed: [] }, false)
    ).toBe('high')
  })

  it('returns medium for value-field modifications', () => {
    expect(
      classifyChangeSeverity(
        {
          added: [],
          removed: [],
          changed: [{ ruleKey: 'permit', field: 'value', from: 'no', to: 'yes' }],
        },
        false
      )
    ).toBe('medium')
  })

  it('returns medium for details-field modifications', () => {
    expect(
      classifyChangeSeverity(
        {
          added: [],
          removed: [],
          changed: [{ ruleKey: 'permit', field: 'details', from: 'a', to: 'b' }],
        },
        false
      )
    ).toBe('medium')
  })

  it('returns low when only codeRef/codeUrl changed', () => {
    expect(
      classifyChangeSeverity(
        {
          added: [],
          removed: [],
          changed: [{ ruleKey: 'permit', field: 'codeUrl', from: 'old', to: 'new' }],
        },
        false
      )
    ).toBe('low')
  })
})

describe('isEmptyDiff', () => {
  it('detects an empty diff', () => {
    expect(isEmptyDiff(emptyDiff)).toBe(true)
  })

  it('detects a non-empty diff (added)', () => {
    expect(isEmptyDiff({ added: ['x'], removed: [], changed: [] })).toBe(false)
  })
})

describe('writeChangeEvent', () => {
  it('returns null and skips DB write when diff is empty and status unchanged', async () => {
    const result = await writeChangeEvent({
      marketId: 'mkt-1',
      rulesVersionFrom: 'v0',
      rulesVersionTo: 'v0',
      diff: emptyDiff,
      statusChanged: false,
    })
    expect(result).toBeNull()
    expect(mockDb.marketChangeEvent.create).not.toHaveBeenCalled()
  })

  it('writes a row and returns it when diff is non-empty', async () => {
    mockDb.marketChangeEvent.create.mockResolvedValueOnce({
      id: 'evt-1',
      marketId: 'mkt-1',
      severity: 'high',
    })

    const result = await writeChangeEvent({
      marketId: 'mkt-1',
      rulesVersionFrom: 'v1',
      rulesVersionTo: 'v2',
      diff: { added: ['new_rule'], removed: [], changed: [] },
      statusChanged: false,
    })

    expect(result?.id).toBe('evt-1')
    expect(mockDb.marketChangeEvent.create).toHaveBeenCalledOnce()
    const args = mockDb.marketChangeEvent.create.mock.calls[0][0]
    expect(args.data.severity).toBe('high')
    expect(args.data.rulesVersionFrom).toBe('v1')
    expect(args.data.rulesVersionTo).toBe('v2')
  })

  it('writes when diff is empty but statusChanged=true', async () => {
    mockDb.marketChangeEvent.create.mockResolvedValueOnce({ id: 'evt-2', severity: 'high' })
    const result = await writeChangeEvent({
      marketId: 'mkt-1',
      rulesVersionFrom: 'v1',
      rulesVersionTo: 'v2',
      diff: emptyDiff,
      statusChanged: true,
    })
    expect(result?.id).toBe('evt-2')
  })
})
