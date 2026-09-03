"use client";

import { Plus, MapPin, Link2 } from "lucide-react";
import { cn } from "@notion-clone/ui";
import type { CalendarEvent } from "@/server/calendar/queries";

function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

export function DayView({
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
  const start = new Date(anchor);
  start.setHours(0, 0, 0, 0);
  const end = new Date(anchor);
  end.setHours(23, 59, 59, 999);

  const dayEvents = events
    .filter((e) => e.startAt <= end && e.endAt >= start)
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  return (
    <div className="mx-auto h-full max-w-2xl overflow-y-auto p-4">
      <div className="mb-3 flex justify-end">
        <button
          type="button"
          onClick={() => onCreateAt(anchor)}
          className="flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-sm text-text hover:bg-hover"
        >
          <Plus className="size-3.5" /> New event
        </button>
      </div>
      {dayEvents.length === 0 ? (
        <p className="py-16 text-center text-sm text-text-faint">Nothing scheduled today.</p>
      ) : (
        <div className="space-y-1.5">
          {dayEvents.map((event) => (
            <button
              key={event.id}
              type="button"
              onClick={() => onSelectEvent(event)}
              className={cn(
                "flex w-full items-start gap-3 rounded-lg border border-border bg-surface p-3 text-left hover:bg-hover",
                event.syncStatus === "error" && "border-destructive/40",
              )}
            >
              <div className="w-20 shrink-0 pt-0.5 text-xs text-text-faint">
                {event.allDay ? "All day" : formatTime(event.startAt)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium text-text">{event.title}</p>
                  {event.syncStatus === "synced" ? (
                    <Link2 className="size-3 shrink-0 text-text-faint" aria-label="Synced with Google Calendar" />
                  ) : null}
                </div>
                {event.location ? (
                  <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-text-muted">
                    <MapPin className="size-3 shrink-0" /> {event.location}
                  </p>
                ) : null}
                {event.description ? (
                  <p className="mt-1 line-clamp-2 text-xs text-text-muted">{event.description}</p>
                ) : null}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
