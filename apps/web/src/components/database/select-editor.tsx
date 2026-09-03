"use client";

import * as React from "react";
import { Check, Plus } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger, cn } from "@notion-clone/ui";
import { statusCategories, STATUS_CATEGORY_META, type SelectOption, type StatusCategory } from "@notion-clone/contracts";
import { SELECT_COLOR_CLASSES, colorForIndex } from "./types";

/** Shared editor for select / status (single-choice) and multi_select — Notion's three
 * "pick from a set of colored options, or create a new one inline" property types.
 * Status options additionally carry a `category` (todo/in_progress/complete); when any
 * option in the list has one, the picker groups by category instead of a flat list —
 * `select`/`multi_select` options never set `category`, so they're unaffected. */
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
  const isStatus = options.some((o) => o.category);

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

  function OptionRow({ option }: { option: SelectOption }) {
    return (
      <button
        key={option.id}
        onClick={() => toggle(option.id)}
        className="flex w-full items-center justify-between gap-2 rounded-md px-2 py-1 hover:bg-hover"
      >
        <span className="flex min-w-0 items-center gap-1.5">
          {option.category ? <StatusDot category={option.category} /> : null}
          <span
            className={cn(
              "truncate rounded px-1.5 py-0.5 text-xs",
              SELECT_COLOR_CLASSES[option.color] ?? SELECT_COLOR_CLASSES.gray,
            )}
          >
            {option.name}
          </span>
        </span>
        {value.includes(option.id) ? <Check className="size-3.5 shrink-0 text-accent" /> : null}
      </button>
    );
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
          className="mb-2 w-full rounded-md border border-border bg-surface px-2 py-1 text-base outline-none focus-visible:ring-2 focus-visible:ring-focus"
        />
        <div className="max-h-64 space-y-0.5 overflow-y-auto">
          {isStatus
            ? statusCategories.map((category) => {
                const inCategory = filtered.filter((o) => o.category === category);
                if (inCategory.length === 0) return null;
                return (
                  <div key={category} className="pt-1.5 first:pt-0">
                    <p className="px-2 pb-0.5 text-xs text-text-faint">{STATUS_CATEGORY_META[category].label}</p>
                    {inCategory.map((option) => (
                      <OptionRow key={option.id} option={option} />
                    ))}
                  </div>
                );
              })
            : filtered.map((option) => <OptionRow key={option.id} option={option} />)}
          {query.trim() && !exactMatch ? (
            <button
              onClick={handleCreate}
              className="flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-sm text-text-muted hover:bg-hover"
            >
              <Plus className="size-3.5" /> Create &ldquo;{query.trim()}&rdquo;
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}

/** The todo/in-progress/complete indicator Notion's own Status property uses: an empty
 * ring, a half-filled ring, and a filled dot — recognizable at a glance in a table cell
 * or board card without reading the label, and distinct from a plain `select` pill
 * (which never gets this, since only status options carry a category). An inline SVG
 * rather than a CSS clip-path/border trick — precise at this size (10px) and doesn't
 * depend on border-box quirks to render the half-fill correctly. */
export function StatusDot({ category }: { category: StatusCategory }) {
  const colorClass = category === "todo" ? "text-text-faint" : "text-accent";
  return (
    <svg viewBox="0 0 10 10" className={cn("size-2.5 shrink-0", colorClass)} aria-hidden>
      <circle cx="5" cy="5" r="4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      {category === "complete" ? (
        <circle cx="5" cy="5" r="2.4" fill="currentColor" />
      ) : category === "in_progress" ? (
        <path d="M5 1 A4 4 0 0 1 5 9 Z" fill="currentColor" />
      ) : null}
    </svg>
  );
}

export function OptionPill({ option }: { option: SelectOption }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      {option.category ? <StatusDot category={option.category} /> : null}
      <span className={cn("rounded px-1.5 py-0.5 text-xs", SELECT_COLOR_CLASSES[option.color] ?? SELECT_COLOR_CLASSES.gray)}>
        {option.name}
      </span>
    </span>
  );
}

export function nextOptionColor(existing: SelectOption[]): string {
  return colorForIndex(existing.length);
}
