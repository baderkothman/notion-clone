"use client";

import { useRef, useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@notion-clone/ui";
import type { CalendarEvent } from "@/server/calendar/queries";
import { getMonthGridDays, isSameDay } from "./calendar-date-utils";
import { EventPill } from "./event-pill";

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MAX_VISIBLE_PER_DAY = 3;

export function MonthView({
  anchor,
  events,
  onSelectEvent,
  onCreateAt,
  onRescheduleEvent,
  onShowDay,
}: {
  anchor: Date;
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onCreateAt: (date: Date) => void;
  onRescheduleEvent: (event: CalendarEvent, newDayStart: Date) => void;
  onShowDay: (date: Date) => void;
}) {
  const days = getMonthGridDays(anchor);
  const today = new Date();
  const draggingEventIdRef = useRef<string | null>(null);
  const [dragOverDay, setDragOverDay] = useState<number | null>(null);

  function eventsForDay(day: Date): CalendarEvent[] {
    return events
      .filter((e) => e.startAt <= endOfDay(day) && e.endAt >= startOfDay(day))
      .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  }

  return (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-7 border-b border-border text-xs font-medium text-text-faint">
        {WEEKDAY_LABELS.map((label) => (
          <div key={label} className="p-2 text-center">
            {label}
          </div>
        ))}
      </div>
      <div className="grid flex-1 grid-cols-7 grid-rows-6">
        {days.map((day, i) => {
          const dayEvents = eventsForDay(day);
          const isCurrentMonth = day.getMonth() === anchor.getMonth();
          const isToday = isSameDay(day, today);
          const overflow = dayEvents.length - MAX_VISIBLE_PER_DAY;

          return (
            <div
              key={day.getTime()}
              className={cn(
                "group relative flex min-h-24 flex-col border-b border-r border-border p-1",
                !isCurrentMonth && "bg-sidebar/50",
                dragOverDay === i && "bg-selected",
              )}
              onDragOver={(e) => {
                if (!draggingEventIdRef.current) return;
                e.preventDefault();
                setDragOverDay(i);
              }}
              onDragLeave={() => setDragOverDay((d) => (d === i ? null : d))}
              onDrop={(e) => {
                e.preventDefault();
                setDragOverDay(null);
                const event = events.find((ev) => ev.id === draggingEventIdRef.current);
                draggingEventIdRef.current = null;
                if (event) onRescheduleEvent(event, day);
              }}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "flex size-5 items-center justify-center rounded-full text-xs",
                    isToday ? "bg-accent font-semibold text-accent-text" : isCurrentMonth ? "text-text" : "text-text-faint",
                  )}
                >
                  {day.getDate()}
                </span>
                <button
                  type="button"
                  onClick={() => onCreateAt(day)}
                  aria-label={`New event on ${day.getFullYear()}-${day.getMonth() + 1}-${day.getDate()}`}
                  className="flex size-5 items-center justify-center rounded opacity-0 hover:bg-hover group-hover:opacity-100 group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus"
                >
                  <Plus className="size-3 text-text-faint" />
                </button>
              </div>
              <div className="mt-1 flex flex-1 flex-col gap-0.5 overflow-hidden">
                {dayEvents.slice(0, MAX_VISIBLE_PER_DAY).map((event) => (
                  <EventPill
                    key={event.id}
                    event={event}
                    compact
                    draggable
                    onDragStart={() => {
                      draggingEventIdRef.current = event.id;
                    }}
                    onClick={() => onSelectEvent(event)}
                  />
                ))}
                {overflow > 0 ? (
                  <button
                    type="button"
                    onClick={() => onShowDay(day)}
                    className="px-1.5 text-left text-xs text-text-faint hover:text-text"
                  >
                    +{overflow} more
                  </button>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}
