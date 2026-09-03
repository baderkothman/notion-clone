import { z } from "zod";

/**
 * Calendar contracts — see packages/database/src/schema/calendar.ts for the storage
 * shape this validates against, and docs/ARCHITECTURE.md's "Calendar & Google Calendar
 * sync" section for the sync model these types support.
 */

// Deliberately not full RFC5545 recurrence editing — a bounded preset list, expressed
// as a real RRULE string once resolved server-side (see calendar/recurrence.ts), which
// is what actually gets sent to Google on a push. See calendar.ts schema's doc comment
// for why this is a scoped-down choice, not an oversight.
export const recurrenceFrequencySchema = z.enum(["none", "daily", "weekly", "monthly"]);
export type RecurrenceFrequency = z.infer<typeof recurrenceFrequencySchema>;

export const attendeeSchema = z.object({
  email: z.string().email(),
  name: z.string().max(200).optional(),
});
export type Attendee = z.infer<typeof attendeeSchema>;

// A real `Date` object, not an ISO string — Next.js Server Actions serialize `Date`
// arguments natively (the same Flight protocol RSC props use, not plain JSON.stringify),
// so a client component can construct `new Date(...)` and pass it straight through.
// Using `z.string().datetime().pipe(z.coerce.date())` instead would split the exported
// type into a "what .parse() accepts" (string) shape vs. a "what .parse() returns"
// (Date) shape via z.infer, which silently mismatches what callers actually need to
// construct — z.date() keeps input and output the same type everywhere this is used.
const eventDateTime = z.date();

const eventFieldsBase = {
  title: z.string().trim().min(1, "Give this event a title.").max(300),
  description: z.string().max(10_000).optional(),
  location: z.string().max(500).optional(),
  startAt: eventDateTime,
  endAt: eventDateTime,
  timezone: z.string().min(1).max(100), // IANA name, e.g. "America/New_York"
  allDay: z.boolean().default(false),
  recurrence: recurrenceFrequencySchema.default("none"),
  attendees: z.array(attendeeSchema).max(50).default([]),
  /** Which connected Google account to mirror this event to. `null`/omitted = local
   * only. A workspace member syncs against *their own* connection — see
   * events.ts's `createCalendarEvent` for why this can't be someone else's. */
  googleConnectionId: z.string().uuid().nullable().optional(),
};

export const createCalendarEventSchema = z
  .object({ workspaceId: z.string().uuid(), ...eventFieldsBase })
  .refine((v) => v.endAt.getTime() >= v.startAt.getTime(), {
    message: "End time must be after the start time.",
    path: ["endAt"],
  });
export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;

export const updateCalendarEventSchema = z
  .object({
    eventId: z.string().uuid(),
    title: eventFieldsBase.title.optional(),
    description: eventFieldsBase.description,
    location: eventFieldsBase.location,
    startAt: eventFieldsBase.startAt.optional(),
    endAt: eventFieldsBase.endAt.optional(),
    timezone: eventFieldsBase.timezone.optional(),
    allDay: eventFieldsBase.allDay.optional(),
    recurrence: eventFieldsBase.recurrence.optional(),
    attendees: eventFieldsBase.attendees.optional(),
    googleConnectionId: eventFieldsBase.googleConnectionId,
  })
  .refine((v) => !v.startAt || !v.endAt || v.endAt.getTime() >= v.startAt.getTime(), {
    message: "End time must be after the start time.",
    path: ["endAt"],
  });
export type UpdateCalendarEventInput = z.infer<typeof updateCalendarEventSchema>;

export const deleteCalendarEventSchema = z.object({ eventId: z.string().uuid() });
export type DeleteCalendarEventInput = z.infer<typeof deleteCalendarEventSchema>;

export const listCalendarEventsSchema = z
  .object({ workspaceId: z.string().uuid(), rangeStart: eventDateTime, rangeEnd: eventDateTime })
  .refine((v) => v.rangeEnd.getTime() >= v.rangeStart.getTime(), {
    message: "Range end must be after range start.",
    path: ["rangeEnd"],
  });
export type ListCalendarEventsInput = z.infer<typeof listCalendarEventsSchema>;

export const selectGoogleCalendarSchema = z.object({
  connectionId: z.string().uuid(),
  googleCalendarId: z.string().min(1).max(500),
});
export type SelectGoogleCalendarInput = z.infer<typeof selectGoogleCalendarSchema>;

// Minimum scopes requested during OAuth — read/write on events, read-only on the
// calendar list (to populate the "which calendar?" picker). Deliberately not the
// broader `calendar` scope (which also allows creating/deleting calendars themselves,
// not just events) — see docs/SECURITY.md "Google OAuth scopes".
export const GOOGLE_OAUTH_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.calendarlist.readonly",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;
