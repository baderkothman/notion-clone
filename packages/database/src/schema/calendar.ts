import { pgTable, text, timestamp, uuid, boolean, jsonb, pgEnum, index, unique } from "drizzle-orm/pg-core";
import { users } from "./identity";
import { workspaces } from "./workspaces";

/**
 * First-class calendar — a genuinely new module (not a Notion-style database property
 * calendar view; see database-views.ts's `calendar` view kind, which is a different,
 * unrelated feature: a way to lay out an existing database's rows on a grid by one of
 * its Date properties). This is the workspace-level Calendar: its own events, optionally
 * mirrored to/from a user's connected Google Calendar. See docs/ARCHITECTURE.md
 * "Calendar & Google Calendar sync".
 */

export const googleConnectionStatusEnum = pgEnum("google_connection_status", [
  "connected",
  "error",
  "revoked",
]);

/**
 * One row per user's connected Google account. `accessToken`/`refreshToken` are
 * AES-256-GCM-encrypted at rest via packages/shared's `encryptSecret`/`decryptSecret`
 * (GOOGLE_TOKEN_ENCRYPTION_KEY) — deliberately not using the Auth.js adapter's
 * `accounts` table (schema/identity.ts), which stores provider tokens in plaintext per
 * the standard adapter contract; this integration holds itself to a stricter bar since
 * these tokens grant live access to a user's real Google Calendar. See
 * docs/SECURITY.md "Integration token storage".
 *
 * Scoped to one workspace, not just one user: a Google account is personal, but events
 * pulled from it have to land somewhere, and letting one connection feed events into
 * every workspace the user belongs to would make `(googleConnectionId, googleEventId)`
 * ambiguous the moment the same connection is synced from two workspaces (which
 * workspace does a given remote event "belong" to?). Scoping the connection to the
 * workspace it was created from removes the ambiguity: connect from Workspace A's
 * Settings, sync into Workspace A; to use Google Calendar with Workspace B too,
 * disconnect and reconnect from there instead. `userId` stays unique — one Google
 * account can't power two connections at once. See docs/ARCHITECTURE.md "Calendar &
 * Google Calendar sync".
 */
export const googleCalendarConnections = pgTable("google_calendar_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  googleAccountEmail: text("google_account_email").notNull(),
  accessToken: text("access_token").notNull(),
  refreshToken: text("refresh_token").notNull(),
  scope: text("scope").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  /** Which of the user's Google calendars events sync to/from. Defaults to "primary";
   * exposed as a picker (fetched via calendarList.list) once connected. */
  googleCalendarId: text("google_calendar_id").notNull().default("primary"),
  /** Google's opaque incremental-sync cursor (events.list `nextSyncToken`). Null means
   * "no successful sync yet" — the next sync runs a full pull instead of incremental.
   * Cleared (not just left stale) whenever Google returns 410 Gone for an expired
   * token, forcing the next sync back to full. */
  syncToken: text("sync_token"),
  lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
  status: googleConnectionStatusEnum("status").notNull().default("connected"),
  /** Set when `status = 'error'` — surfaced in Settings so the user knows *why* sync
   * stopped (e.g. "refresh token revoked, reconnect your account") instead of just
   * seeing silence. */
  lastErrorMessage: text("last_error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const calendarEventSyncStatusEnum = pgEnum("calendar_event_sync_status", [
  "local", // never pushed anywhere — no connection was selected when created
  "synced", // last push/pull to Google succeeded
  "syncing", // a push is in flight
  "error", // last push/pull failed — see syncError
]);

/**
 * A workspace's calendar events — local-first (works with zero Google connection),
 * optionally mirrored to one Google Calendar event per row via `googleEventId`.
 * Attendees are stored as jsonb (not a join table): the same deliberate scope-cut
 * precedent as the database "person" property being single-assignee-only
 * (docs/NOTION_PARITY.md) — a full attendee-response-tracking system is a real feature,
 * not a storage detail, and out of scope for this pass.
 */
export const calendarEvents = pgTable(
  "calendar_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    location: text("location"),
    /** Always stored in UTC; `timezone` (IANA name, e.g. "America/New_York") is what
     * the event was authored in and how it's displayed — mirrors Google's
     * dateTime+timeZone shape so no lossy conversion happens on sync in either
     * direction. */
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }).notNull(),
    timezone: text("timezone").notNull(),
    allDay: boolean("all_day").notNull().default(false),
    /** Simple preset RRULE ("none" | daily/weekly/monthly, expressed as a real RFC5545
     * RRULE string once non-"none") — see contracts/calendar.ts. Full custom recurrence
     * editing (Notion/Google's "custom..." builder) is a deliberate scope cut; Google's
     * own recurring events still sync in correctly because incremental sync consumes
     * Google's already-expanded instances (`singleEvents: true`), not our own RRULE.
     */
    recurrenceRule: text("recurrence_rule"),
    attendees: jsonb("attendees").$type<{ email: string; name?: string }[]>().notNull().default([]),
    googleConnectionId: uuid("google_connection_id").references(() => googleCalendarConnections.id, {
      onDelete: "set null",
    }),
    googleEventId: text("google_event_id"),
    /** Google's per-event change token — lets a pulled update be recognized as "this is
     * the same edit we already have" vs. a genuine remote change, without re-diffing
     * full event bodies. */
    googleEtag: text("google_etag"),
    /** Set only for an instance of a recurring Google event, so a future "edit this
     * instance vs. the whole series" UI has something to key off of. Not surfaced yet —
     * see docs/ARCHITECTURE.md's calendar section for what's deliberately deferred. */
    googleRecurringEventId: text("google_recurring_event_id"),
    syncStatus: calendarEventSyncStatusEnum("sync_status").notNull().default("local"),
    syncError: text("sync_error"),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("calendar_events_workspace_range_idx").on(table.workspaceId, table.startAt, table.endAt),
    index("calendar_events_google_connection_idx").on(table.googleConnectionId),
    // A given Google event should only ever mirror to one local row per connection —
    // prevents a duplicate being created if a sync pass ever runs twice on the same
    // remote change (see docs/ARCHITECTURE.md "Duplicate prevention").
    unique("calendar_events_connection_google_event_unique").on(table.googleConnectionId, table.googleEventId),
  ],
);
