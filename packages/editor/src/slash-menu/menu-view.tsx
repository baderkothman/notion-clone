"use client";

import * as React from "react";
import { cn } from "@notion-clone/ui";
import type { SlashMenuItem } from "./items";

export interface SlashMenuListHandle {
  onKeyDown: (event: KeyboardEvent) => boolean;
}

export const SlashMenuList = React.forwardRef<
  SlashMenuListHandle,
  { items: SlashMenuItem[]; command: (item: SlashMenuItem) => void }
>(({ items, command }, ref) => {
  const [selected, setSelected] = React.useState(0);

  React.useImperativeHandle(ref, () => ({
    onKeyDown: (event) => {
      if (event.key === "ArrowDown") {
        setSelected((i) => (i + 1) % items.length);
        return true;
      }
      if (event.key === "ArrowUp") {
        setSelected((i) => (i - 1 + items.length) % items.length);
        return true;
      }
      if (event.key === "Enter") {
        const item = items[selected];
        if (item) command(item);
        return true;
      }
      return false;
    },
  }));

  if (items.length === 0) {
    return (
      <div className="w-72 rounded-lg border border-border bg-surface-raised p-3 text-sm text-text-faint shadow-[var(--color-shadow)]">
        No matching blocks
      </div>
    );
  }

  return (
    <div
      role="listbox"
      className="max-h-80 w-72 overflow-y-auto rounded-lg border border-border bg-surface-raised p-1 shadow-[var(--color-shadow)]"
    >
      {items.map((item, index) => (
        <button
          key={item.key}
          role="option"
          aria-selected={index === selected}
          onClick={() => command(item)}
          onMouseEnter={() => setSelected(index)}
          className={cn(
            "flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left",
            index === selected ? "bg-hover" : "",
          )}
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border bg-surface text-sm text-text-muted">
            {item.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm text-text">{item.title}</span>
            <span className="block truncate text-xs text-text-faint">{item.subtitle}</span>
          </span>
        </button>
      ))}
    </div>
  );
});
SlashMenuList.displayName = "SlashMenuList";
