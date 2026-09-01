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
  function updateFilter(index: number, patch: Partial<FilterCondition>) {
    onChange(filters.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }
  function removeFilter(index: number) {
    onChange(filters.filter((_, i) => i !== index));
  }
  function addFilter() {
    const first = properties[0];
    if (!first) return;
    onChange([...filters, { propertyId: first.id, operator: "equals", value: "" }]);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          <FilterIcon className="h-3.5 w-3.5" /> Filter{filters.length > 0 ? ` (${filters.length})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-96">
        <div className="space-y-2">
          {filters.length === 0 ? <p className="text-sm text-text-faint">No filters</p> : null}
          {filters.map((filter, index) => {
            const property = properties.find((p) => p.id === filter.propertyId);
            return (
              <div key={index} className="flex items-center gap-1.5">
                <select
                  value={filter.propertyId}
                  onChange={(e) => updateFilter(index, { propertyId: e.target.value })}
                  className="min-w-0 flex-1 rounded-md border border-border bg-surface px-1.5 py-1 text-xs"
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
                  className="rounded-md border border-border bg-surface px-1.5 py-1 text-xs"
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
                    onChange={(e) =>
                      updateFilter(index, {
                        value: property?.type === "number" ? Number(e.target.value) : e.target.value,
                      })
                    }
                    className="w-20 rounded-md border border-border bg-surface px-1.5 py-1 text-xs"
                  />
                ) : null}
                <button onClick={() => removeFilter(index)} aria-label="Remove filter" className="text-text-faint hover:text-destructive">
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          })}
          <button onClick={addFilter} className="flex items-center gap-1 text-xs text-text-muted hover:text-text">
            <Plus className="h-3.5 w-3.5" /> Add filter
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
  function updateSort(index: number, patch: Partial<SortCondition>) {
    onChange(sorts.map((s, i) => (i === index ? { ...s, ...patch } : s)));
  }
  function removeSort(index: number) {
    onChange(sorts.filter((_, i) => i !== index));
  }
  function addSort() {
    const first = properties[0];
    if (!first) return;
    onChange([...sorts, { propertyId: first.id, direction: "asc" }]);
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" variant="ghost">
          <ArrowUpDown className="h-3.5 w-3.5" /> Sort{sorts.length > 0 ? ` (${sorts.length})` : ""}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-80">
        <div className="space-y-2">
          {sorts.length === 0 ? <p className="text-sm text-text-faint">No sorts</p> : null}
          {sorts.map((sort, index) => (
            <div key={index} className="flex items-center gap-1.5">
              <select
                value={sort.propertyId}
                onChange={(e) => updateSort(index, { propertyId: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-border bg-surface px-1.5 py-1 text-xs"
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
                className="rounded-md border border-border bg-surface px-1.5 py-1 text-xs"
              >
                <option value="asc">Ascending</option>
                <option value="desc">Descending</option>
              </select>
              <button onClick={() => removeSort(index)} aria-label="Remove sort" className="text-text-faint hover:text-destructive">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
          <button onClick={addSort} className="flex items-center gap-1 text-xs text-text-muted hover:text-text">
            <Plus className="h-3.5 w-3.5" /> Add sort
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
