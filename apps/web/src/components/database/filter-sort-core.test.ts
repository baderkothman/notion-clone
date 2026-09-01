import { describe, expect, it } from "vitest";
import { filterRows, sortRows } from "./filter-sort-core";
import type { DatabaseRow } from "./types";

const PROP_A = "11111111-1111-1111-1111-111111111111";
const PROP_B = "22222222-2222-2222-2222-222222222222";

function row(id: string, title = ""): DatabaseRow {
  return { id, title, icon: null, sortKey: id };
}

const rows = [row("r1", "Alpha"), row("r2", "Beta"), row("r3", "Gamma")];
const values: Record<string, Record<string, unknown>> = {
  r1: { [PROP_A]: 10, [PROP_B]: "urgent" },
  r2: { [PROP_A]: 5, [PROP_B]: null },
  r3: { [PROP_A]: 20, [PROP_B]: "urgent" },
};
const getValue = (rowId: string, propertyId: string) => values[rowId]?.[propertyId] ?? null;

describe("filterRows", () => {
  it("returns all rows when there are no filters", () => {
    expect(filterRows(rows, getValue, [])).toHaveLength(3);
  });

  it("equals filters to an exact value", () => {
    const result = filterRows(rows, getValue, [{ propertyId: PROP_B, operator: "equals", value: "urgent" }]);
    expect(result.map((r) => r.id)).toEqual(["r1", "r3"]);
  });

  it("is_empty / is_not_empty treat null as empty", () => {
    expect(filterRows(rows, getValue, [{ propertyId: PROP_B, operator: "is_empty" }]).map((r) => r.id)).toEqual(["r2"]);
    expect(filterRows(rows, getValue, [{ propertyId: PROP_B, operator: "is_not_empty" }]).map((r) => r.id)).toEqual([
      "r1",
      "r3",
    ]);
  });

  it("greater_than / less_than compare numbers", () => {
    expect(filterRows(rows, getValue, [{ propertyId: PROP_A, operator: "greater_than", value: 8 }]).map((r) => r.id)).toEqual(
      ["r1", "r3"],
    );
    expect(filterRows(rows, getValue, [{ propertyId: PROP_A, operator: "less_than", value: 8 }]).map((r) => r.id)).toEqual([
      "r2",
    ]);
  });

  it("combines multiple filters with AND semantics", () => {
    const result = filterRows(rows, getValue, [
      { propertyId: PROP_B, operator: "equals", value: "urgent" },
      { propertyId: PROP_A, operator: "greater_than", value: 15 },
    ]);
    expect(result.map((r) => r.id)).toEqual(["r3"]);
  });
});

describe("sortRows", () => {
  it("returns rows unchanged when there are no sorts", () => {
    expect(sortRows(rows, getValue, [])).toEqual(rows);
  });

  it("sorts ascending and descending by a numeric property", () => {
    expect(sortRows(rows, getValue, [{ propertyId: PROP_A, direction: "asc" }]).map((r) => r.id)).toEqual([
      "r2",
      "r1",
      "r3",
    ]);
    expect(sortRows(rows, getValue, [{ propertyId: PROP_A, direction: "desc" }]).map((r) => r.id)).toEqual([
      "r3",
      "r1",
      "r2",
    ]);
  });

  it("sorts empty values last regardless of direction", () => {
    const withEmpty = [row("x"), row("y"), row("z")];
    const vals: Record<string, Record<string, unknown>> = { x: { [PROP_A]: 1 }, y: {}, z: { [PROP_A]: 2 } };
    const get = (rowId: string, propertyId: string) => vals[rowId]?.[propertyId] ?? null;
    expect(sortRows(withEmpty, get, [{ propertyId: PROP_A, direction: "desc" }]).map((r) => r.id)).toEqual([
      "z",
      "x",
      "y",
    ]);
  });

  it("does not mutate the input array", () => {
    const copy = [...rows];
    sortRows(rows, getValue, [{ propertyId: PROP_A, direction: "asc" }]);
    expect(rows).toEqual(copy);
  });
});
