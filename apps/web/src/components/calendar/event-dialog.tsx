"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { Button, Dialog, DialogContent, Input, Label } from "@notion-clone/ui";
import type { RecurrenceFrequency } from "@notion-clone/contracts";
import type { CalendarEvent } from "@/server/calendar/queries";
import {
  createCalendarEventAction,
  updateCalendarEventAction,
  deleteCalendarEventAction,
} from "@/app/(app)/actions/calendar";

/** Duplicated from packages/shared/src/recurrence.ts's `rruleToFrequency` rather than
 * imported — that package's barrel (`index.ts`) also re-exports `ids.ts`/`crypto.ts`,
 * both of which import `node:crypto`, which webpack can't bundle into a client
 * component at all ("use client" above). Keep this in sync with the server-side
 * version's three known presets if either changes. */
function rruleToFrequency(rrule: string | null | undefined): RecurrenceFrequency | "custom" {
  if (!rrule) return "none";
  const normalized = rrule.replace(/^RRULE:/, "");
  if (normalized === "FREQ=DAILY") return "daily";
  if (normalized === "FREQ=WEEKLY") return "weekly";
  if (normalized === "FREQ=MONTHLY") return "monthly";
  return "custom";
}

/** Always the browser's own timezone — no timezone picker in this pass (a real,
 * separate piece of UI, not a form-layout detail). An event created "for" a different
 * timezone than the creator's own is a deliberate scope cut, same precedent as the
 * database "person" property being single-assignee-only (docs/NOTION_PARITY.md). */
function browserTimezone(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

function toDateInput(date: Date): string {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
}
function toTimeInput(date: Date): string {
  return date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}
function roundToNextHalfHour(date: Date): Date {
  const d = new Date(date);
  d.setSeconds(0, 0);
  d.setMinutes(d.getMinutes() < 30 ? 30 : 0, 0, 0);
  if (d.getMinutes() === 0 && date.getMinutes() >= 30) d.setHours(d.getHours() + 1);
  return d;
}

function EventDateFields({
  allDay,
  startDate,
  startTime,
  endDate,
  endTime,
  onStartDateChange,
  onStartTimeChange,
  onEndDateChange,
  onEndTimeChange,
}: {
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  onStartDateChange: (value: string) => void;
  onStartTimeChange: (value: string) => void;
  onEndDateChange: (value: string) => void;
  onEndTimeChange: (value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div className="space-y-1.5">
        <Label htmlFor="event-start-date">Starts</Label>
        <div className="flex gap-1.5">
          <Input
            id="event-start-date"
            type="date"
            value={startDate}
            onChange={(e) => onStartDateChange(e.target.value)}
            required
          />
          {!allDay ? (
            <Input
              type="time"
              aria-label="Start time"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              required
              className="w-28"
            />
          ) : null}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="event-end-date">Ends</Label>
        <div className="flex gap-1.5">
          <Input
            id="event-end-date"
            type="date"
            value={endDate}
            onChange={(e) => onEndDateChange(e.target.value)}
            required
          />
          {!allDay ? (
            <Input
              type="time"
              aria-label="End time"
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              required
              className="w-28"
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function EventDialogFooter({
  isEditing,
  deleting,
  pending,
  onDelete,
  onCancel,
}: {
  isEditing: boolean;
  deleting: boolean;
  pending: boolean;
  onDelete: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="flex items-center justify-between pt-1">
      {isEditing ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onDelete}
          disabled={deleting}
          aria-label="Delete event"
          className="text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="size-3.5" />
        </Button>
      ) : (
        <span />
      )}
      <div className="flex gap-2">
        <Button type="button" variant="secondary" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" variant="primary" size="sm" disabled={pending}>
          {pending ? "Saving…" : isEditing ? "Save changes" : "Create event"}
        </Button>
      </div>
    </div>
  );
}

export function EventDialog({
  open,
  onOpenChange,
  workspaceId,
  event,
  initialDate,
  googleConnectionId,
  onSaved,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  event: CalendarEvent | null;
  initialDate: Date | null;
  /** The workspace's connected Google account, if any — offered as a "sync to Google
   * Calendar" checkbox. Null when nothing is connected, in which case the checkbox
   * doesn't render at all rather than showing disabled UI for a feature the workspace
   * hasn't set up. */
  googleConnectionId: string | null;
  onSaved: (event: CalendarEvent) => void;
  onDeleted: (eventId: string) => void;
}) {
  const isEditing = Boolean(event);
  const start = event?.startAt ?? roundToNextHalfHour(initialDate ?? new Date());
  const defaultEnd = event?.endAt ?? new Date(start.getTime() + 30 * 60_000);

  const [title, setTitle] = useState(event?.title ?? "");
  const [description, setDescription] = useState(event?.description ?? "");
  const [location, setLocation] = useState(event?.location ?? "");
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startDate, setStartDate] = useState(() => toDateInput(start));
  const [startTime, setStartTime] = useState(() => toTimeInput(start));
  const [endDate, setEndDate] = useState(() => toDateInput(defaultEnd));
  const [endTime, setEndTime] = useState(() => toTimeInput(defaultEnd));
  const [recurrence, setRecurrence] = useState<RecurrenceFrequency>(() => {
    const f = rruleToFrequency(event?.recurrenceRule);
    return f === "custom" ? "none" : f;
  });
  const [attendeesText, setAttendeesText] = useState(() => (event?.attendees ?? []).map((a) => a.email).join(", "));
  const [syncToGoogle, setSyncToGoogle] = useState(
    isEditing ? Boolean(event?.googleConnectionId) : Boolean(googleConnectionId),
  );
  const [error, setError] = useState<string | null>(null);
  const [pending, startSaving] = useTransition();
  const [deleting, startDeleting] = useTransition();

  function buildDateTime(dateStr: string, timeStr: string): Date {
    if (allDay) return new Date(`${dateStr}T00:00:00`);
    return new Date(`${dateStr}T${timeStr}:00`);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const attendees = attendeesText
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map((email) => ({ email }));

    const payload = {
      title,
      description: description || undefined,
      location: location || undefined,
      startAt: buildDateTime(startDate, startTime),
      endAt: buildDateTime(endDate, endTime),
      timezone: browserTimezone(),
      allDay,
      recurrence,
      attendees,
      googleConnectionId: syncToGoogle ? googleConnectionId : null,
    };

    startSaving(async () => {
      const result = isEditing
        ? await updateCalendarEventAction({ eventId: event!.id, ...payload })
        : await createCalendarEventAction({ workspaceId, ...payload });

      if (!result.ok) {
        setError(result.error);
        return;
      }
      if (result.value.syncStatus === "error" && result.value.syncError) {
        toast.error(`Saved, but Google sync failed: ${result.value.syncError}`);
      } else {
        toast.success(isEditing ? "Event updated." : "Event created.");
      }
      onSaved(result.value);
      onOpenChange(false);
    });
  }

  function handleDelete() {
    if (!event) return;
    if (!confirm("Delete this event?")) return;
    startDeleting(async () => {
      const result = await deleteCalendarEventAction({ eventId: event.id });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Event deleted.");
      onDeleted(event.id);
      onOpenChange(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title={isEditing ? "Edit event" : "New event"} className="max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="event-title">Title</Label>
            <Input id="event-title" value={title} onChange={(e) => setTitle(e.target.value)} required autoFocus />
          </div>

          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              checked={allDay}
              onChange={(e) => setAllDay(e.target.checked)}
              className="size-4 rounded border-border"
            />
            All day
          </label>

          <EventDateFields
            allDay={allDay}
            startDate={startDate}
            startTime={startTime}
            endDate={endDate}
            endTime={endTime}
            onStartDateChange={setStartDate}
            onStartTimeChange={setStartTime}
            onEndDateChange={setEndDate}
            onEndTimeChange={setEndTime}
          />

          <div className="space-y-1.5">
            <Label htmlFor="event-location">Location</Label>
            <Input id="event-location" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="event-description">Description</Label>
            <textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              className="w-full rounded-md border border-border bg-surface px-3 py-1.5 text-base text-text placeholder:text-text-faint focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="event-recurrence">Repeats</Label>
              <select
                id="event-recurrence"
                value={recurrence}
                onChange={(e) => setRecurrence(e.target.value as RecurrenceFrequency)}
                className="h-9 w-full rounded-md border border-border bg-surface px-3 text-base text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus sm:text-sm"
              >
                <option value="none">Doesn&apos;t repeat</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="event-attendees">Attendees</Label>
              <Input
                id="event-attendees"
                placeholder="name@example.com, …"
                value={attendeesText}
                onChange={(e) => setAttendeesText(e.target.value)}
              />
            </div>
          </div>

          {googleConnectionId ? (
            <label className="flex items-center gap-2 text-sm text-text">
              <input
                type="checkbox"
                checked={syncToGoogle}
                onChange={(e) => setSyncToGoogle(e.target.checked)}
                className="size-4 rounded border-border"
              />
              Sync to Google Calendar
            </label>
          ) : null}

          {error ? (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          ) : null}

          <EventDialogFooter
            isEditing={isEditing}
            deleting={deleting}
            pending={pending}
            onDelete={handleDelete}
            onCancel={() => onOpenChange(false)}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}
