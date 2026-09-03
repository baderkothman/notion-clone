"use client";

import { Plus } from "lucide-react";
import { cn } from "@notion-clone/ui";
import type { CalendarEvent } from "@/server/calendar/queries";
import { getWeekDays, isSameDay } from "./calendar-date-utils";
import { EventPill } from "./event-pill";

/** A 7-day-column layout rather than an hour-by-hour time grid — each column is a
 * small per-day agenda. A pixel-accurate time grid (events positioned by exact
 * minute, overlap-aware) is real, separate engineering scope beyond this pass; see
 * docs/ARCHITECTURE.md's calendar section for why Month + this + Day + Agenda cover
 * the requested view set without it. */
export function WeekView({
  anchor,
  events,
  onSelectEvent,
  onCreateAt,
}: {
  anchor: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onCreateAt: (date: Date) => void;
}) {
  const days = getWeekDays(anchor);
  const today = new Date();

  function eventsForDay(day: Date): CalendarEvent[] {
    const start = new Date(day);
    start.setHours(0, 0, 0, 0);
    const end = new Date(day);
    end.setHours(23, 59, 59, 999);
    return events
      .filter((e) => e.startAt <= end && e.endAt >= start)
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }

  return (
    <div className="grid h-full grid-cols-7 divide-x divide-border overflow-y-auto">
      {days.map((day) => {
        const dayEvents = eventsForDay(day);
        const isToday = isSameDay(day, today);
        return (
          <div key={day.toISOString()} className="group flex min-h-full flex-col">
            <div
              className={cn(
                "sticky top-0 flex items-center justify-between border-b border-border bg-bg px-2 py-2",
              )}
            >
              <div>
                <p className="text-xs text-text-faint">{day.toLocaleDateString("en-US", { weekday: "short" })}</p>
                <p className={cn("text-sm font-medium", isToday ? "text-accent" : "text-text")}>{day.getDate()}</p>
              </div>
              <button
                type="button"
                onClick={() => onCreateAt(day)}
                aria-label={`New event on ${day.toLocaleDateString()}`}
                className="flex size-5 items-center justify-center rounded opacity-0 hover:bg-hover group-hover:opacity-100 group-focus-within:opacity-100"
              >
                <Plus className="size-3 text-text-faint" />
              </button>
            </div>
            <div className="flex flex-1 flex-col gap-1 p-1.5">
              {dayEvents.length === 0 ? (
                <p className="px-1 pt-2 text-xs text-text-faint">—</p>
              ) : (
                dayEvents.map((event) => (
                  <EventPill key={event.id} event={event} onClick={() => onSelectEvent(event)} />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
