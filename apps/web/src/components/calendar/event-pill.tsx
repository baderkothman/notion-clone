"use client";

import { Link2 } from "lucide-react";
import { cn } from "@notion-clone/ui";
import type { CalendarEvent } from "@/server/calendar/queries";
import { LocalDateText } from "@/components/local-date-text";

/**
 * One event's chip — used in month/week/day/agenda views alike. The small `Link2` mark
 * is the one visual cue distinguishing a Google-synced event from a local-only one
 * (per "visual distinction between local and externally synchronized data"); an error
 * state gets a distinct color rather than silently looking the same as "synced".
 */
export function EventPill({
  event,
  onClick,
  draggable,
  onDragStart,
  compact,
}: {
  event: CalendarEvent;
  onClick?: () => void;
  draggable?: boolean;
  onDragStart?: (e: React.DragEvent) => void;
  compact?: boolean;
}) {
  const isSynced = event.syncStatus === "synced";
  const isError = event.syncStatus === "error";

  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={onDragStart}
      onClick={onClick}
      title={event.title}
      className={cn(
        "flex w-full items-center gap-1 rounded px-1.5 py-0.5 text-left text-xs",
        "truncate transition-colors",
        isError
          ? "bg-destructive/10 text-destructive hover:bg-destructive/15"
          : "bg-selected text-accent hover:opacity-80",
        compact && "py-0",
      )}
    >
      {!event.allDay ? (
        <span className="shrink-0 tabular-nums opacity-80">
          <LocalDateText value={event.startAt} format="time" />
        </span>
      ) : null}
      <span className="truncate font-medium">{event.title}</span>
      {isSynced ? <Link2 className="ml-auto size-2.5 shrink-0 opacity-60" aria-label="Synced with Google Calendar" /> : null}
    </button>
  );
}
