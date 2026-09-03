import "server-only";
import { google, type calendar_v3 } from "googleapis";
import { db, calendarEvents, googleCalendarConnections, eq, and } from "@notion-clone/database";
import { ExternalServiceError, ValidationError } from "@notion-clone/shared";
import { getAuthorizedClient } from "./client";
import { getGoogleConnectionByWorkspaceId, type GoogleCalendarConnection } from "./queries";
import { assertWorkspaceCapability } from "../../permissions/assert";

/** How far back/forward the very first sync pulls. After that, incremental sync (via
 * Google's `syncToken`) takes over and this window never applies again — see
 * docs/ARCHITECTURE.md "Calendar & Google Calendar sync". */
const INITIAL_SYNC_PAST_DAYS = 30;
const INITIAL_SYNC_FUTURE_DAYS = 180;
const PAGE_SIZE = 250;

function isGoogleGoneError(error: unknown): boolean {
  const err = error as { code?: number; response?: { status?: number } };
  return err?.code === 410 || err?.response?.status === 410;
}

/** Converts a Google Calendar API event into our storage shape. All-day events carry
 * `start.date`/`end.date` (no time component, no timezone); timed events carry
 * `start.dateTime`/`end.dateTime` plus `start.timeZone` — mirroring that distinction
 * (rather than normalizing everything to a single shape) is what lets a pulled all-day
 * event round-trip back to Google as all-day if it's ever edited and pushed again. */
function fromGoogleEvent(
  event: calendar_v3.Schema$Event,
  workspaceId: string,
  connectionId: string,
  createdByUserId: string,
) {
  const allDay = Boolean(event.start?.date && !event.start?.dateTime);
  const startAt = allDay ? new Date(`${event.start!.date}T00:00:00Z`) : new Date(event.start!.dateTime!);
  const endAt = allDay ? new Date(`${event.end!.date}T00:00:00Z`) : new Date(event.end!.dateTime!);
  return {
    workspaceId,
    createdByUserId,
    title: event.summary?.trim() || "(untitled event)",
    description: event.description ?? null,
    location: event.location ?? null,
    startAt,
    endAt,
    timezone: event.start?.timeZone ?? "UTC",
    allDay,
    recurrenceRule: event.recurrence?.[0] ?? null,
    attendees: (event.attendees ?? [])
      .filter((a): a is calendar_v3.Schema$EventAttendee & { email: string } => Boolean(a.email))
      .map((a) => ({ email: a.email, name: a.displayName ?? undefined })),
    googleConnectionId: connectionId,
    googleEventId: event.id!,
    googleEtag: event.etag ?? null,
    googleRecurringEventId: event.recurringEventId ?? null,
    syncStatus: "synced" as const,
    syncError: null,
    updatedAt: new Date(),
  };
}

async function runSyncPass(
  calendar: calendar_v3.Calendar,
  connection: GoogleCalendarConnection,
  useSyncToken: boolean,
): Promise<{ pulled: number; deleted: number; nextSyncToken: string | undefined }> {
  let pageToken: string | undefined;
  let nextSyncToken: string | undefined;
  let pulled = 0;
  let deleted = 0;
  const syncToken = useSyncToken ? (connection.syncToken ?? undefined) : undefined;
  const now = Date.now();

  do {
    const response = await calendar.events.list({
      calendarId: connection.googleCalendarId,
      singleEvents: true, // expands recurring events into concrete instances — see
      // schema/calendar.ts's doc comment on why we don't parse RRULEs ourselves.
      showDeleted: true, // required to see cancellations during incremental sync
      maxResults: PAGE_SIZE,
      pageToken,
      ...(syncToken
        ? { syncToken }
        : {
            timeMin: new Date(now - INITIAL_SYNC_PAST_DAYS * 86_400_000).toISOString(),
            timeMax: new Date(now + INITIAL_SYNC_FUTURE_DAYS * 86_400_000).toISOString(),
            orderBy: "startTime" as const,
          }),
    });

    const writes: Promise<unknown>[] = [];
    for (const event of response.data.items ?? []) {
      if (!event.id) continue;

      if (event.status === "cancelled") {
        // Deleted-on-Google's-side becomes a local soft-delete (not a hard delete,
        // consistent with how the rest of this app treats deletion, see pages' trash).
        writes.push(
          db
            .update(calendarEvents)
            .set({ deletedAt: new Date(), syncStatus: "synced", syncError: null, updatedAt: new Date() })
            .where(
              and(
                eq(calendarEvents.googleConnectionId, connection.id),
                eq(calendarEvents.googleEventId, event.id),
              ),
            ),
        );
        deleted++;
        continue;
      }

      const row = fromGoogleEvent(event, connection.workspaceId, connection.id, connection.userId);
      // Upsert on (googleConnectionId, googleEventId) — see schema/calendar.ts's
      // unique constraint — is what makes re-running a sync pass idempotent: the same
      // remote event arriving twice (a page re-fetched, a sync retried after a
      // transient failure) updates the same row instead of creating a duplicate.
      writes.push(
        db
          .insert(calendarEvents)
          .values(row)
          .onConflictDoUpdate({
            target: [calendarEvents.googleConnectionId, calendarEvents.googleEventId],
            set: row,
          }),
      );
      pulled++;
    }
    await Promise.all(writes);

    pageToken = response.data.nextPageToken ?? undefined;
    if (response.data.nextSyncToken) nextSyncToken = response.data.nextSyncToken;
  } while (pageToken);

  return { pulled, deleted, nextSyncToken };
}

/**
 * Pulls changes from Google into `calendar_events`. Uses the stored `syncToken` for an
 * incremental pull when one exists; otherwise (first sync, or after a 410 forces a
 * reset) does a full pull over the initial window. This function only ever writes
 * *local* rows from *remote* state — it never calls back out to Google to push
 * anything, which is what keeps this one-directional and loop-free (see push.ts for
 * the separate, explicitly user-triggered local→Google direction).
 */
export async function syncGoogleCalendar(
  connection: GoogleCalendarConnection,
): Promise<{ pulled: number; deleted: number }> {
  const client = await getAuthorizedClient(connection);
  const calendar = google.calendar({ version: "v3", auth: client });

  let result: { pulled: number; deleted: number; nextSyncToken: string | undefined };
  try {
    result = await runSyncPass(calendar, connection, true);
  } catch (error) {
    if (isGoogleGoneError(error)) {
      // Google's syncToken expired or was invalidated (its own docs say this can
      // happen, e.g. after ~a week of inactivity) — the only correct recovery is a
      // full resync, not a retry of the same token.
      result = await runSyncPass(calendar, connection, false);
    } else {
      await db
        .update(googleCalendarConnections)
        .set({ status: "error", lastErrorMessage: "Couldn't sync with Google Calendar.", updatedAt: new Date() })
        .where(eq(googleCalendarConnections.id, connection.id));
      throw new ExternalServiceError("Couldn't sync with Google Calendar. Try again shortly.");
    }
  }

  await db
    .update(googleCalendarConnections)
    .set({
      syncToken: result.nextSyncToken ?? connection.syncToken ?? null,
      lastSyncedAt: new Date(),
      status: "connected",
      lastErrorMessage: null,
      updatedAt: new Date(),
    })
    .where(eq(googleCalendarConnections.id, connection.id));

  return { pulled: result.pulled, deleted: result.deleted };
}

/** Entry point for the "Sync now" button and the calendar page's own opportunistic
 * sync-on-load (see calendar page.tsx) — resolves the workspace's connection and
 * authorizes the caller before touching anything. */
export async function syncWorkspaceGoogleCalendar(
  userId: string,
  workspaceId: string,
): Promise<{ pulled: number; deleted: number }> {
  await assertWorkspaceCapability(userId, workspaceId, "useCalendar");
  const connection = await getGoogleConnectionByWorkspaceId(workspaceId);
  if (!connection) throw new ValidationError("No Google account is connected to this workspace.");
  return syncGoogleCalendar(connection);
}
