import "server-only";
import { google, type calendar_v3 } from "googleapis";
import { ExternalServiceError } from "@notion-clone/shared";
import { getAuthorizedClient } from "./client";
import type { GoogleCalendarConnection } from "./queries";
import type { CalendarEvent } from "../../calendar/queries";

/**
 * Local → Google direction of the sync (see sync.ts for the reverse). Only ever called
 * from an explicit, synchronous user action in `apps/web/src/server/calendar/events.ts`
 * (create/update/delete an event while a connection is selected) — never from a
 * background job reacting to a pulled change, which is what keeps this loop-free: a
 * pull never triggers a push, a push never triggers an immediate pull.
 */

function toGoogleEventBody(event: Pick<
  CalendarEvent,
  "title" | "description" | "location" | "startAt" | "endAt" | "timezone" | "allDay" | "recurrenceRule" | "attendees"
>): calendar_v3.Schema$Event {
  const body: calendar_v3.Schema$Event = {
    summary: event.title,
    description: event.description ?? undefined,
    location: event.location ?? undefined,
    attendees: event.attendees.map((a) => ({ email: a.email, displayName: a.name })),
  };
  if (event.allDay) {
    body.start = { date: event.startAt.toISOString().slice(0, 10) };
    body.end = { date: event.endAt.toISOString().slice(0, 10) };
  } else {
    body.start = { dateTime: event.startAt.toISOString(), timeZone: event.timezone };
    body.end = { dateTime: event.endAt.toISOString(), timeZone: event.timezone };
  }
  if (event.recurrenceRule) body.recurrence = [event.recurrenceRule];
  return body;
}

export async function pushEventCreate(
  connection: GoogleCalendarConnection,
  event: Parameters<typeof toGoogleEventBody>[0],
): Promise<{ googleEventId: string; googleEtag: string | null }> {
  const client = await getAuthorizedClient(connection);
  const calendar = google.calendar({ version: "v3", auth: client });
  try {
    const { data } = await calendar.events.insert({
      calendarId: connection.googleCalendarId,
      requestBody: toGoogleEventBody(event),
    });
    if (!data.id) throw new ExternalServiceError("Google did not return an event id.");
    return { googleEventId: data.id, googleEtag: data.etag ?? null };
  } catch (error) {
    if (error instanceof ExternalServiceError) throw error;
    throw new ExternalServiceError("Couldn't create this event in Google Calendar.");
  }
}

export async function pushEventUpdate(
  connection: GoogleCalendarConnection,
  googleEventId: string,
  event: Parameters<typeof toGoogleEventBody>[0],
): Promise<{ googleEtag: string | null }> {
  const client = await getAuthorizedClient(connection);
  const calendar = google.calendar({ version: "v3", auth: client });
  try {
    const { data } = await calendar.events.update({
      calendarId: connection.googleCalendarId,
      eventId: googleEventId,
      requestBody: toGoogleEventBody(event),
    });
    return { googleEtag: data.etag ?? null };
  } catch {
    // A 404 here means the event was deleted on Google's side since we last synced —
    // treat it the same as "update failed," surfaced to the caller as a sync error
    // rather than silently recreating it (recreating would assign a *new* googleEventId
    // and orphan the old one, a duplicate-prevention regression).
    throw new ExternalServiceError("Couldn't update this event in Google Calendar.");
  }
}

export async function pushEventDelete(connection: GoogleCalendarConnection, googleEventId: string): Promise<void> {
  const client = await getAuthorizedClient(connection);
  const calendar = google.calendar({ version: "v3", auth: client });
  try {
    await calendar.events.delete({ calendarId: connection.googleCalendarId, eventId: googleEventId });
  } catch (error) {
    const err = error as { code?: number; response?: { status?: number } };
    // Already gone on Google's side — not an error from our perspective, the end state
    // (event doesn't exist in Google Calendar) is exactly what we wanted.
    if (err?.code === 404 || err?.response?.status === 404 || err?.code === 410 || err?.response?.status === 410) {
      return;
    }
    throw new ExternalServiceError("Couldn't delete this event in Google Calendar.");
  }
}
