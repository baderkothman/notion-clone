import { describe, expect, it } from "vitest";
import { firstSortKey, sortKeyBetween, sortKeysAppending } from "./sort-key";

describe("sort-key", () => {
  it("orders appended keys increasingly", () => {
    const a = firstSortKey();
    const b = sortKeyBetween(a, null);
    const c = sortKeyBetween(b, null);
    expect(a < b).toBe(true);
    expect(b < c).toBe(true);
  });

  it("computes a key strictly between two neighbors for reordering", () => {
    const a = firstSortKey();
    const c = sortKeyBetween(a, null);
    const b = sortKeyBetween(a, c);
    expect(a < b).toBe(true);
    expect(b < c).toBe(true);
  });

  it("generates N ordered keys for bulk inserts (e.g. paste of multiple pages)", () => {
    const keys = sortKeysAppending(null, 5);
    const sorted = [...keys].sort();
    expect(keys).toEqual(sorted);
    expect(new Set(keys).size).toBe(5);
  });
});
