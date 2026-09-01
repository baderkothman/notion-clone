"use client";

import * as React from "react";
import { Check, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, cn } from "@notion-clone/ui";
import type { SelectOption } from "@notion-clone/contracts";
import { SELECT_COLOR_CLASSES, colorForIndex } from "./types";

/** Shared editor for select / status (single-choice) and multi_select — Notion's three
 * "pick from a set of colored options, or create a new one inline" property types. */
export function SelectEditor({
  options,
  value,
  multi,
  onChange,
  onCreateOption,
  children,
}: {
  options: SelectOption[];
  value: string[];
  multi: boolean;
  onChange: (next: string[]) => void;
  onCreateOption: (name: string) => Promise<SelectOption>;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = options.filter((o) => o.name.toLowerCase().includes(query.trim().toLowerCase()));
  const exactMatch = options.some((o) => o.name.toLowerCase() === query.trim().toLowerCase());

  function toggle(optionId: string) {
    if (multi) {
      onChange(value.includes(optionId) ? value.filter((id) => id !== optionId) : [...value, optionId]);
    } else {
      onChange(value.includes(optionId) ? [] : [optionId]);
      setOpen(false);
    }
  }

  async function handleCreate() {
    const name = query.trim();
    if (!name) return;
    const option = await onCreateOption(name);
    toggle(option.id);
    setQuery("");
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-56 p-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search or create…"
          autoFocus
          className="mb-2 w-full rounded-md border border-border bg-surface px-2 py-1 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
        />
        <div className="max-h-48 space-y-0.5 overflow-y-auto">
          {filtered.map((option) => (
            <button
              key={option.id}
              onClick={() => toggle(option.id)}
              className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-hover"
            >
              <span
                className={cn(
                  "rounded px-1.5 py-0.5 text-xs",
                  SELECT_COLOR_CLASSES[option.color] ?? SELECT_COLOR_CLASSES.gray,
                )}
              >
                {option.name}
              </span>
              {value.includes(option.id) ? <Check className="h-3.5 w-3.5 text-accent" /> : null}
            </button>
          ))}
          {query.trim() && !exactMatch ? (
            <button
              onClick={handleCreate}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm text-text-muted hover:bg-hover"
            >
              <Plus className="h-3.5 w-3.5" /> Create &ldquo;{query.trim()}&rdquo;
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export function OptionPill({ option }: { option: SelectOption }) {
  return (
    <span className={cn("rounded px-1.5 py-0.5 text-xs", SELECT_COLOR_CLASSES[option.color] ?? SELECT_COLOR_CLASSES.gray)}>
      {option.name}
    </span>
  );
}

export function nextOptionColor(existing: SelectOption[]): string {
  return colorForIndex(existing.length);
}
