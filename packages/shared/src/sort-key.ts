import { generateKeyBetween, generateNKeysBetween } from "fractional-indexing";

/**
 * Sibling ordering (page tree, database rows, comment threads) uses fractional index
 * keys: short, lexicographically-sortable strings. Reordering one item means computing
 * one new key between its new neighbors — no rewriting every sibling's position, which
 * matters once a page has hundreds of children.
 */
export function firstSortKey(): string {
  return generateKeyBetween(null, null);
}

export function sortKeyBetween(before: string | null, after: string | null): string {
  return generateKeyBetween(before, after);
}

export function sortKeysAppending(after: string | null, count: number): string[] {
  return generateNKeysBetween(after, null, count);
}
