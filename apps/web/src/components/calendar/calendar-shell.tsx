"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@notion-clone/ui";
import type { CalendarEvent } from "@/server/calendar/queries";
import { listCalendarEventsAction, updateCalendarEventAction } from "@/app/(app)/actions/calendar";
import { getQueryRangeForView, shiftAnchor, formatMonthTitle, formatWeekTitle, formatDayTitle } from "./calendar-date-utils";
import { MonthView } from "./month-view";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { AgendaView } from "./agenda-view";
import { EventDialog } from "./event-dialog";

type ViewKind = "month" | "week" | "day" | "agenda";
const VIEWS: { key: ViewKind; label: string }[] = [
  { key: "month", label: "Month" },
  { key: "week", label: "Week" },
  { key: "day", label: "Day" },
  { key: "agenda", label: "Agenda" },
];

export function CalendarShell({
  workspaceId,
  initialEvents,
  initialRangeStart,
  initialRangeEnd,
  googleConnectionId,
}: {
  workspaceId: string;
  initialEvents: CalendarEvent[];
  initialRangeStart: Date;
  initialRangeEnd: Date;
  googleConnectionId: string | null;
}) {
  const [view, setView] = useState<ViewKind>("month");
  const [anchor, setAnchor] = useState(() => new Date());
  const [events, setEvents] = useState(initialEvents);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [createDate, setCreateDate] = useState<Date | null>(null);

  const range = useMemo(() => getQueryRangeForView(view, anchor), [view, anchor]);
  const isInitialRange =
    range.rangeStart.getTime() === initialRangeStart.getTime() && range.rangeEnd.getTime() === initialRangeEnd.getTime();

  useEffect(() => {
    if (isInitialRange) return; // the server already fetched this exact range
    let cancelled = false;
    setLoading(true);
    listCalendarEventsAction({
      workspaceId,
      rangeStart: range.rangeStart,
      rangeEnd: range.rangeEnd,
    }).then((result) => {
      if (cancelled) return;
      setLoading(false);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setEvents(result.value);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- range is derived from view+anchor; re-running on the Date object's identity (new each render) would loop
  }, [view, anchor.getTime(), workspaceId]);

  function openCreateDialog(date: Date) {
    setEditingEvent(null);
    setCreateDate(date);
    setDialogOpen(true);
  }
  function openEditDialog(event: CalendarEvent) {
    setEditingEvent(event);
    setCreateDate(null);
    setDialogOpen(true);
  }
  function handleSaved(event: CalendarEvent) {
    setEvents((prev) => {
      const exists = prev.some((e) => e.id === event.id);
      return exists ? prev.map((e) => (e.id === event.id ? event : e)) : [...prev, event];
    });
  }
  function handleDeleted(eventId: string) {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  }

  async function handleReschedule(event: CalendarEvent, newDayStart: Date) {
    const durationMs = event.endAt.getTime() - event.startAt.getTime();
    const newStart = new Date(newDayStart);
    if (!event.allDay) {
      newStart.setHours(event.startAt.getHours(), event.startAt.getMinutes(), 0, 0);
    } else {
      newStart.setHours(0, 0, 0, 0);
    }
    const newEnd = new Date(newStart.getTime() + durationMs);

    const previous = events;
    setEvents((prev) => prev.map((e) => (e.id === event.id ? { ...e, startAt: newStart, endAt: newEnd } : e)));

    const result = await updateCalendarEventAction({
      eventId: event.id,
      startAt: newStart,
      endAt: newEnd,
    });
    if (!result.ok) {
      setEvents(previous);
      toast.error(result.error);
      return;
    }
    setEvents((prev) => prev.map((e) => (e.id === event.id ? result.value : e)));
    toast.success("Event rescheduled.");
  }

  const title =
    view === "month"
      ? formatMonthTitle(anchor)
      : view === "week"
        ? formatWeekTitle(anchor)
        : view === "day"
          ? formatDayTitle(anchor)
          : "Upcoming";

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setAnchor(new Date())}
            className="rounded-md border border-border px-2.5 py-1 text-xs font-medium text-text hover:bg-hover"
          >
            Today
          </button>
          <div className="flex items-center">
            <button
              type="button"
              aria-label="Previous"
              onClick={() => setAnchor((a) => shiftAnchor(view, a, -1))}
              className="flex size-7 items-center justify-center rounded-md hover:bg-hover"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              type="button"
              aria-label="Next"
              onClick={() => setAnchor((a) => shiftAnchor(view, a, 1))}
              className="flex size-7 items-center justify-center rounded-md hover:bg-hover"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
          <h1 className="text-sm font-semibold text-text">{title}</h1>
          {loading ? <span className="text-xs text-text-faint">Syncing…</span> : null}
        </div>

        <div className="flex items-center gap-2">
          <nav aria-label="Calendar view" className="flex rounded-md border border-border p-0.5">
            {VIEWS.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => setView(v.key)}
                className={cn(
                  "rounded px-2.5 py-1 text-xs font-medium",
                  view === v.key ? "bg-selected text-accent" : "text-text-muted hover:text-text",
                )}
              >
                {v.label}
              </button>
            ))}
          </nav>
          <button
            type="button"
            onClick={() => openCreateDialog(anchor)}
            className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-xs font-medium text-accent-text hover:opacity-90"
          >
            <Plus className="size-3.5" /> New event
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1">
        {view === "month" ? (
          <MonthView
            anchor={anchor}
            events={events}
            onSelectEvent={openEditDialog}
            onCreateAt={openCreateDialog}
            onRescheduleEvent={handleReschedule}
            onShowDay={(date) => {
              setAnchor(date);
              setView("day");
            }}
          />
        ) : view === "week" ? (
          <WeekView anchor={anchor} events={events} onSelectEvent={openEditDialog} onCreateAt={openCreateDialog} />
        ) : view === "day" ? (
          <DayView anchor={anchor} events={events} onSelectEvent={openEditDialog} onCreateAt={openCreateDialog} />
        ) : (
          <AgendaView events={events} onSelectEvent={openEditDialog} onCreateEvent={() => openCreateDialog(anchor)} />
        )}
      </div>

      <EventDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        workspaceId={workspaceId}
        event={editingEvent}
        initialDate={createDate}
        googleConnectionId={googleConnectionId}
        onSaved={handleSaved}
        onDeleted={handleDeleted}
      />
    </div>
  );
}
