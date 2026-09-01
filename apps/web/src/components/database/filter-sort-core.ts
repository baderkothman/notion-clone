import type { FilterCondition, SortCondition } from "@notion-clone/contracts";
import type { DatabaseRow } from "./types";

/**
 * Pure row filtering/sorting — no React, no server calls — so it's unit-testable and
 * reusable across Table/Board/List/Calendar views. Runs client-side over the rows/values
 * already loaded for the database (phase-1 scope: fine for the row counts a single
 * database page holds; a server-side filtered query is the natural upgrade path if that
 * changes, without this function's callers needing to change).
 */
export function filterRows(
  rows: DatabaseRow[],
  getValue: (rowId: string, propertyId: string) => unknown,
  filters: FilterCondition[],
): DatabaseRow[] {
  if (filters.length === 0) return rows;
  return rows.filter((row) => filters.every((filter) => matchesFilter(getValue(row.id, filter.propertyId), filter)));
}

function matchesFilter(value: unknown, filter: FilterCondition): boolean {
  const isEmpty = value === null || value === undefined || value === "" || (Array.isArray(value) && value.length === 0);

  switch (filter.operator) {
    case "is_empty":
      return isEmpty;
    case "is_not_empty":
      return !isEmpty;
    case "equals":
      if (Array.isArray(value)) return value.includes(filter.value);
      return value === filter.value;
    case "not_equals":
      if (Array.isArray(value)) return !value.includes(filter.value);
      return value !== filter.value;
    case "contains":
      return typeof value === "string" && typeof filter.value === "string"
        ? value.toLowerCase().includes(filter.value.toLowerCase())
        : false;
    case "not_contains":
      return typeof value === "string" && typeof filter.value === "string"
        ? !value.toLowerCase().includes(filter.value.toLowerCase())
        : true;
    case "greater_than":
      return typeof value === "number" && typeof filter.value === "number" ? value > filter.value : false;
    case "less_than":
      return typeof value === "number" && typeof filter.value === "number" ? value < filter.value : false;
    default:
      return true;
  }
}

export function sortRows(
  rows: DatabaseRow[],
  getValue: (rowId: string, propertyId: string) => unknown,
  sorts: SortCondition[],
): DatabaseRow[] {
  if (sorts.length === 0) return rows;
  return [...rows].sort((a, b) => {
    for (const sort of sorts) {
      const va = getValue(a.id, sort.propertyId);
      const vb = getValue(b.id, sort.propertyId);
      const aEmpty = va === null || va === undefined;
      const bEmpty = vb === null || vb === undefined;
      // Empty values sort last no matter the direction — handled before the
      // direction flip below, since naively negating a "nulls last" comparator for
      // descending order would put nulls first instead.
      if (aEmpty && bEmpty) continue;
      if (aEmpty) return 1;
      if (bEmpty) return -1;

      const cmp = compareValues(va, vb);
      if (cmp !== 0) return sort.direction === "asc" ? cmp : -cmp;
    }
    return 0;
  });
}

function compareValues(a: NonNullable<unknown>, b: NonNullable<unknown>): number {
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
}
