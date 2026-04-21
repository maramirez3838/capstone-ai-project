/**
 * Normalizes a raw user search input to a consistent form used for slug,
 * alias, and partial-name lookups. Must stay in sync with the FE lib/search.ts
 * normalization logic.
 */
export function normalizeQuery(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[.,/#!$%^&*;:{}=\-_`~()]/g, '')
}
