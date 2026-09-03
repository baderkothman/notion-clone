"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, File } from "lucide-react";
import { Button, cn } from "@notion-clone/ui";
import type { DatabaseRow } from "./types";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Builds a 6-row grid (42 days) starting on the Sunday on/before the 1st of the month —
 * a fixed-size grid keeps the layout stable across months instead of reflowing. */
function buildGridDays(monthStart: Date): Date[] {
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - gridStart.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });
}

export function CalendarView({
  rows,
  getValue,
  datePropertyId,
  onOpenRow,
}: {
  rows: DatabaseRow[];
  getValue: (rowId: string, propertyId: string) => unknown;
  datePropertyId: string | null;
  onOpenRow: (rowId: string) => void;
}) {
  const [month, setMonth] = React.useState(() => startOfMonth(new Date()));

  if (!datePropertyId) {
    return (
      <p className="rounded-md border border-dashed border-border p-8 text-center text-sm text-text-muted">
        Pick a Date property to place rows on the calendar.
      </p>
    );
  }

  const rowsByDate = new Map<string, DatabaseRow[]>();
  for (const row of rows) {
    const value = getValue(row.id, datePropertyId);
    if (typeof value !== "string" || !value) continue;
    const list = rowsByDate.get(value) ?? [];
    list.push(row);
    rowsByDate.set(value, list);
  }

  const days = buildGridDays(month);
  const today = toDateKey(new Date());

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-text">{MONTHS[month.getMonth()]} {month.getFullYear()}</h3>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            aria-label="Previous month"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          >
            <ChevronLeft className="size-3.5" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setMonth(startOfMonth(new Date()))}>
            Today
          </Button>
          <Button
            size="icon"
            variant="ghost"
            aria-label="Next month"
            onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          >
            <ChevronRight className="size-3.5" />
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-md border border-border bg-border">
        {WEEKDAYS.map((day) => (
          <div key={day} className="bg-surface px-2 py-1.5 text-center text-xs font-medium text-text-faint">
            {day}
          </div>
        ))}
        {days.map((day) => {
          const key = toDateKey(day);
          const inMonth = day.getMonth() === month.getMonth();
          const dayRows = rowsByDate.get(key) ?? [];
          return (
            <div
              key={key}
              className={cn("min-h-[92px] bg-surface p-1.5", !inMonth && "bg-hover/30")}
            >
              <span
                className={cn(
                  "text-xs",
                  key === today ? "flex h-5 w-5 items-center justify-center rounded-full bg-accent text-accent-text" : "text-text-faint",
                  !inMonth && "opacity-50",
                )}
              >
                {day.getDate()}
              </span>
              <div className="mt-1 space-y-0.5">
                {dayRows.slice(0, 3).map((row) => (
                  <button
                    key={row.id}
                    onClick={() => onOpenRow(row.id)}
                    className="flex w-full items-center gap-1 truncate rounded bg-selected px-1 py-0.5 text-left text-xs text-text hover:opacity-80"
                  >
                    <span className="shrink-0">{row.icon ?? <File className="size-2.5" />}</span>
                    <span className="truncate">{row.title || "Untitled"}</span>
                  </button>
                ))}
                {dayRows.length > 3 ? (
                  <p className="px-1 text-xs text-text-faint">+{dayRows.length - 3} more</p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
