"use client";

import * as React from "react";
import { ArrowUpDown, Filter as FilterIcon, Plus, X } from "lucide-react";
import { Button, Popover, PopoverContent, PopoverTrigger } from "@notion-clone/ui";
import type { FilterCondition, SortCondition } from "@notion-clone/contracts";
import type { DatabaseProperty } from "./types";

const OPERATOR_LABELS: Record<FilterCondition["operator"], string> = {
  equals: "is",
  not_equals: "is not",
  contains: "contains",
  not_contains: "doesn't contain",
  is_empty: "is empty",
  is_not_empty: "is not empty",
  greater_than: "greater than",
  less_than: "less than",
};

function needsValue(operator: FilterCondition["operator"]): boolean {
  return operator !== "is_empty" && operator !== "is_not_empty";
}

export function FilterControl({
  properties,
  filters,
  onChange,
}: {
  properties: DatabaseProperty[];
  filters: FilterCondition[];
  onChange: (filters: FilterCondition[]) => void;
}) {
  // The parent remounts this control when the active view changes. Within one view,
  // every add/remove updates these stable row keys alongside the persisted filters.
  const [keys, setKeys] = React.useState(() => filters.map(() => crypto.randomUUID()));

  function updateFilter(index: number, patch: Partial<FilterCondition>) {
    onChange(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }
  function removeFilter(index: number) {
    setKeys((current) => current.filter((_, i) => i !== index));
    onChange(filters.filter((_, i) => i !== index));
  }
  function addFilter() {
    const first = properties[0];
    if (!first) return;
    setKeys((current) => [...current, crypto.randomUUID()]);
    onChange([...filters, { propertyId: first.id, operator: "equals", value: "" }]);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          <FilterIcon className="size-3.5" /> Filter{filters.length > 0 ? ` (${filters.length})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96">
        <div className="space-y-2">
          {filters.length === 0 ? <p className="text-sm text-text-faint">No filters</p> : null}
          {filters.map((filter, index) => {
            const property = properties.find((p) => p.id === filter.propertyId);
            return (
              <div key={keys[index]!} className="flex items-center gap-1.5">
                <select
                  value={filter.propertyId}
                  onChange={(e) => updateFilter(index, { propertyId: e.target.value })}
                  aria-label="Filter property"
                  className="min-w-0 flex-1 rounded-md border border-border bg-surface px-1.5 py-1 text-base"
                >
                  {properties.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filter.operator}
                  onChange={(e) => updateFilter(index, { operator: e.target.value as FilterCondition["operator"] })}
                  aria-label="Filter operator"
                  className="rounded-md border border-border bg-surface px-1.5 py-1 text-base"
                >
                  {Object.entries(OPERATOR_LABELS).map(([op, label]) => (
                    <option key={op} value={op}>
                      {label}
                    </option>
                  ))}
                </select>
                {needsValue(filter.operator) ? (
                  <input
                    type={property?.type === "number" ? "number" : "text"}
                    value={typeof filter.value === "string" || typeof filter.value === "number" ? filter.value : ""}
                    onChange={(e) => {
                      if (property?.type !== "number") {
                        updateFilter(index, { value: e.target.value });
                        return;
                      }
                      // Guard the parse: an empty/in-progress/invalid number input must
                      // not silently coerce to 0 (`Number("")`) or leak a NaN into the
                      // stored filter value (`Number("abc")`) — either would corrupt
                      // the persisted view config and produce a comparison that never
                      // matches, with no visible error.
                      const raw = e.target.value;
                      if (raw === "") return updateFilter(index, { value: "" });
                      const parsed = Number(raw);
                      if (Number.isNaN(parsed)) return;
                      updateFilter(index, { value: parsed });
                    }}
                    aria-label="Filter value"
                    className="w-20 rounded-md border border-border bg-surface px-1.5 py-1 text-base"
                  />
                ) : null}
                <button onClick={() => removeFilter(index)} aria-label="Remove filter" className="text-text-faint hover:text-destructive">
                  <X className="size-3.5" />
                </button>
              </div>
            );
          })}
          <button onClick={addFilter} className="flex items-center gap-1 text-xs text-text-muted hover:text-text">
            <Plus className="size-3.5" /> Add filter
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function SortControl({
  properties,
  sorts,
  onChange,
}: {
  properties: DatabaseProperty[];
  sorts: SortCondition[];
  onChange: (sorts: SortCondition[]) => void;
}) {
  const [keys, setKeys] = React.useState(() => sorts.map(() => crypto.randomUUID()));

  function updateSort(index: number, patch: Partial<SortCondition>) {
    onChange(sorts.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }
  function removeSort(index: number) {
    setKeys((current) => current.filter((_, i) => i !== index));
    onChange(sorts.filter((_, i) => i !== index));
  }
  function addSort() {
    const first = properties[0];
    if (!first) return;
    setKeys((current) => [...current, crypto.randomUUID()]);
    onChange([...sorts, { propertyId: first.id, direction: "asc" }]);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          <ArrowUpDown className="size-3.5" /> Sort{sorts.length > 0 ? ` (${sorts.length})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="space-y-2">
          {sorts.length === 0 ? <p className="text-sm text-text-faint">No sorts</p> : null}
          {sorts.map((sort, index) => (
            <div key={keys[index]!} className="flex items-center gap-1.5">
              <select
                value={sort.propertyId}
                onChange={(e) => updateSort(index, { propertyId: e.target.value })}
                aria-label="Sort property"
                className="min-w-0 flex-1 rounded-md border border-border bg-surface px-1.5 py-1 text-base"
              >
                {properties.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <select
                value={sort.direction}
                onChange={(e) => updateSort(index, { direction: e.target.value as "asc" | "desc" })}
                aria-label="Sort direction"
                className="rounded-md border border-border bg-surface px-1.5 py-1 text-base"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
              <button onClick={() => removeSort(index)} aria-label="Remove sort" className="text-text-faint hover:text-destructive">
                <X className="size-3.5" />
              </button>
            </div>
          ))}
          <button onClick={addSort} className="flex items-center gap-1 text-xs text-text-muted hover:text-text">
            <Plus className="size-3.5" /> Add sort
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
