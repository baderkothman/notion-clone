"use client";

import { CalendarPlus, Link2, MapPin } from "lucide-react";
import { cn, EmptyState } from "@notion-clone/ui";
import type { CalendarEvent } from "@/server/calendar/queries";
import { isSameDay } from "./calendar-date-utils";
import { LocalDateText } from "@/components/local-date-text";

/** The rolling "what's coming up" view — also doubles as the friendliest empty state
 * of the four views (see EmptyState below), since a blank month grid reads as "broken"
 * while an empty agenda reads as "nothing scheduled yet, add something." */
export function AgendaView({
  events,
  onSelectEvent,
  onCreateEvent,
}: {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onCreateEvent: () => void;
}) {
  const sorted = [...events].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const groups: { day: Date; items: CalendarEvent[] }[] = [];
  for (const event of sorted) {
    const last = groups[groups.length - 1];
    if (last && isSameDay(last.day, event.startAt)) {
      last.items.push(event);
    } else {
      groups.push({ day: event.startAt, items: [event] });
    }
  }

  if (groups.length === 0) {
    return (
      <EmptyState
        icon={<CalendarPlus className="size-8" />}
        title="Nothing scheduled"
        description="Events in the next 30 days will show up here — add one to get started."
        action={
          <button
            type="button"
            onClick={onCreateEvent}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-text hover:opacity-90"
          >
            New event
          </button>
        }
      />
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 overflow-y-auto p-4">
      {groups.map((group) => (
        <div key={group.day.toISOString()}>
          <p className="mb-1.5 text-xs font-medium text-text-faint">
            <LocalDateText value={group.day} format="agendaDay" />
          </p>
          <div className="space-y-1">
            {group.items.map((event) => (
              <button
                key={event.id}
                type="button"
                onClick={() => onSelectEvent(event)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border border-border bg-surface px-3 py-2 text-left hover:bg-hover",
                  event.syncStatus === "error" && "border-destructive/40",
                )}
              >
                <span className="w-16 shrink-0 text-xs text-text-faint">
                  {event.allDay ? "All day" : <LocalDateText value={event.startAt} format="time" />}
                </span>
                <span className="min-w-0 flex-1 truncate text-sm text-text">{event.title}</span>
                {event.location ? (
                  <span className="hidden shrink-0 items-center gap-1 text-xs text-text-faint sm:flex">
                    <MapPin className="size-3" /> {event.location}
                  </span>
                ) : null}
                {event.syncStatus === "synced" ? (
                  <Link2 className="size-3 shrink-0 text-text-faint" aria-label="Synced with Google Calendar" />
                ) : null}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
