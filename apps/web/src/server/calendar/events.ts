import "server-only";
import { db, calendarEvents, eq } from "@notion-clone/database";
import {
  createCalendarEventSchema,
  updateCalendarEventSchema,
  deleteCalendarEventSchema,
  type CreateCalendarEventInput,
} from "@notion-clone/contracts";
import { NotFoundError, ValidationError, frequencyToRRule } from "@notion-clone/shared";
import { assertWorkspaceCapability } from "../permissions/assert";
import { getGoogleConnectionById } from "../integrations/google-calendar/queries";
import { pushEventCreate, pushEventUpdate, pushEventDelete } from "../integrations/google-calendar/push";
import { getCalendarEventById, type CalendarEvent } from "./queries";

/**
 * Calendar event CRUD. Authorization is workspace-level (`useCalendar` capability —
 * see packages/contracts/src/workspaces.ts's ROLE_CAPABILITIES), not per-event: any
 * member can manage any workspace event, matching a shared team-calendar model rather
 * than a personal one. A documented scope decision, same precedent as the database
 * "person" property being single-assignee-only (docs/NOTION_PARITY.md) — per-event
 * ownership/edit restrictions are a real feature, not implemented here.
 *
 * The Google push (when a connection is selected) never blocks or fails the local
 * write: a push failure is recorded on the row (`syncStatus: "error"`, `syncError`) and
 * surfaced in the UI, but the event itself is always created/updated/deleted locally
 * first — the same "local truth first, sync is best-effort" shape as autosave falling
 * back when realtime is unavailable (see docs/ARCHITECTURE.md).
 */

async function resolveConnection(userId: string, workspaceId: string, googleConnectionId: string | null | undefined) {
  if (!googleConnectionId) return null;
  const connection = await getGoogleConnectionById(googleConnectionId);
  if (!connection || connection.workspaceId !== workspaceId) {
    throw new ValidationError("That Google account isn't connected to this workspace.");
  }
  if (connection.status !== "connected") {
    throw new ValidationError("Reconnect your Google account before syncing this event.");
  }
  return connection;
}

function eventFieldsForPush(source: {
  title: string;
  description: string | null;
  location: string | null;
  startAt: Date;
  endAt: Date;
  timezone: string;
  allDay: boolean;
  recurrenceRule: string | null;
  attendees: { email: string; name?: string }[];
}) {
  return source;
}

export async function createCalendarEvent(userId: string, raw: unknown): Promise<CalendarEvent> {
  const input: CreateCalendarEventInput = createCalendarEventSchema.parse(raw);
  await assertWorkspaceCapability(userId, input.workspaceId, "useCalendar");

  const connection = await resolveConnection(userId, input.workspaceId, input.googleConnectionId);
  const recurrenceRule = frequencyToRRule(input.recurrence);

  const [created] = await db
    .insert(calendarEvents)
    .values({
      workspaceId: input.workspaceId,
      createdByUserId: userId,
      title: input.title,
      description: input.description ?? null,
      location: input.location ?? null,
      startAt: input.startAt,
      endAt: input.endAt,
      timezone: input.timezone,
      allDay: input.allDay,
      recurrenceRule,
      attendees: input.attendees,
      googleConnectionId: connection?.id ?? null,
      syncStatus: connection ? "syncing" : "local",
    })
    .returning();

  if (!created) throw new ValidationError("Could not create this event.");
  if (!connection) return created;

  try {
    const { googleEventId, googleEtag } = await pushEventCreate(connection, eventFieldsForPush(created));
    const [updated] = await db
      .update(calendarEvents)
      .set({ googleEventId, googleEtag, syncStatus: "synced", syncError: null, updatedAt: new Date() })
      .where(eq(calendarEvents.id, created.id))
      .returning();
    return updated ?? created;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't sync this event to Google Calendar.";
    const [updated] = await db
      .update(calendarEvents)
      .set({ syncStatus: "error", syncError: message, updatedAt: new Date() })
      .where(eq(calendarEvents.id, created.id))
      .returning();
    return updated ?? created;
  }
}

export async function updateCalendarEvent(userId: string, raw: unknown): Promise<CalendarEvent> {
  const input = updateCalendarEventSchema.parse(raw);
  const existing = await getCalendarEventById(input.eventId);
  if (!existing || existing.deletedAt) throw new NotFoundError("Event");
  await assertWorkspaceCapability(userId, existing.workspaceId, "useCalendar");

  const googleConnectionId =
    input.googleConnectionId !== undefined ? input.googleConnectionId : existing.googleConnectionId;
  const connection = await resolveConnection(userId, existing.workspaceId, googleConnectionId);

  const merged = {
    title: input.title ?? existing.title,
    description: input.description !== undefined ? (input.description ?? null) : existing.description,
    location: input.location !== undefined ? (input.location ?? null) : existing.location,
    startAt: input.startAt ?? existing.startAt,
    endAt: input.endAt ?? existing.endAt,
    timezone: input.timezone ?? existing.timezone,
    allDay: input.allDay ?? existing.allDay,
    recurrenceRule: input.recurrence ? frequencyToRRule(input.recurrence) : existing.recurrenceRule,
    attendees: input.attendees ?? existing.attendees,
  };

  const wasLinked = Boolean(existing.googleConnectionId && existing.googleEventId);
  const isNowLinked = Boolean(connection);

  let syncPatch: Partial<CalendarEvent> = {
    googleConnectionId: connection?.id ?? null,
  };

  try {
    if (connection && wasLinked && existing.googleEventId && existing.googleConnectionId === connection.id) {
      // Same connection as before — push an update to the existing Google event.
      const { googleEtag } = await pushEventUpdate(connection, existing.googleEventId, merged);
      syncPatch = { ...syncPatch, googleEventId: existing.googleEventId, googleEtag, syncStatus: "synced", syncError: null };
    } else if (connection && !wasLinked) {
      // Newly linked to a connection — create it on Google for the first time.
      const { googleEventId, googleEtag } = await pushEventCreate(connection, merged);
      syncPatch = { ...syncPatch, googleEventId, googleEtag, syncStatus: "synced", syncError: null };
    } else if (!isNowLinked && wasLinked && existing.googleConnectionId && existing.googleEventId) {
      // Unlinked — remove it from Google, keep it locally.
      const oldConnection = await getGoogleConnectionById(existing.googleConnectionId);
      if (oldConnection) await pushEventDelete(oldConnection, existing.googleEventId);
      syncPatch = { googleConnectionId: null, googleEventId: null, googleEtag: null, syncStatus: "local", syncError: null };
    } else if (!connection) {
      syncPatch = { googleConnectionId: null, googleEventId: null, googleEtag: null, syncStatus: "local", syncError: null };
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Couldn't sync this event to Google Calendar.";
    syncPatch = { ...syncPatch, syncStatus: "error", syncError: message };
  }

  const [updated] = await db
    .update(calendarEvents)
    .set({ ...merged, ...syncPatch, updatedAt: new Date() })
    .where(eq(calendarEvents.id, existing.id))
    .returning();
  if (!updated) throw new ValidationError("Could not update this event.");
  return updated;
}

export async function deleteCalendarEvent(userId: string, raw: unknown): Promise<void> {
  const input = deleteCalendarEventSchema.parse(raw);
  const existing = await getCalendarEventById(input.eventId);
  if (!existing || existing.deletedAt) throw new NotFoundError("Event");
  await assertWorkspaceCapability(userId, existing.workspaceId, "useCalendar");

  if (existing.googleConnectionId && existing.googleEventId) {
    const connection = await getGoogleConnectionById(existing.googleConnectionId);
    if (connection) {
      // Best-effort: if Google is unreachable, the event still gets removed locally
      // (a "delete" the user asked for shouldn't get stuck because of the network) —
      // the next sync pass will reconcile if it turns out Google's copy survived.
      try {
        await pushEventDelete(connection, existing.googleEventId);
      } catch {
        // swallow — see comment above
      }
    }
  }

  await db
    .update(calendarEvents)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(eq(calendarEvents.id, existing.id));
}
