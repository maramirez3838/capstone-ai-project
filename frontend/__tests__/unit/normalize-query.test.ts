import { describe, it, expect } from 'vitest'
import { normalizeQuery } from '@/lib/normalize'

describe('normalizeQuery', () => {
  it('lowercases input', () => {
    expect(normalizeQuery('Santa Monica')).toBe('santa monica')
  })

  it('trims leading and trailing whitespace', () => {
    expect(normalizeQuery('  los angeles  ')).toBe('los angeles')
  })

  it('collapses multiple spaces to one', () => {
    expect(normalizeQuery('west   hollywood')).toBe('west hollywood')
  })

  it('removes punctuation characters', () => {
    expect(normalizeQuery('santa monica, ca.')).toBe('santa monica ca')
    expect(normalizeQuery('west-hollywood')).toBe('westhollywood')
  })

  it('handles a clean slug-style input unchanged', () => {
    expect(normalizeQuery('pasadena')).toBe('pasadena')
  })

  it('handles combined whitespace and punctuation', () => {
    expect(normalizeQuery('  Malibu, CA!  ')).toBe('malibu ca')
  })

  it('handles empty string', () => {
    expect(normalizeQuery('')).toBe('')
  })
})
