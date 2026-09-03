import "server-only";
import { db, calendarEvents, eq, and, gte, lte, isNull } from "@notion-clone/database";
import { listCalendarEventsSchema } from "@notion-clone/contracts";
import { assertWorkspaceCapability } from "../permissions/assert";

export type CalendarEvent = typeof calendarEvents.$inferSelect;

/**
 * Lists non-deleted events in `[rangeStart, rangeEnd]` (an event overlaps the range if
 * it starts before the range ends *and* ends after the range starts — not merely
 * "starts inside the range", so a multi-day event that begins before the visible month
 * still shows up). See `calendar_events_workspace_range_idx` — this is exactly the
 * query it's shaped for.
 */
export async function listCalendarEvents(userId: string, raw: unknown): Promise<CalendarEvent[]> {
  const input = listCalendarEventsSchema.parse(raw);
  await assertWorkspaceCapability(userId, input.workspaceId, "useCalendar");

  return db
    .select()
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.workspaceId, input.workspaceId),
        isNull(calendarEvents.deletedAt),
        lte(calendarEvents.startAt, input.rangeEnd),
        gte(calendarEvents.endAt, input.rangeStart),
      ),
    )
    .orderBy(calendarEvents.startAt);
}

export async function getCalendarEventById(eventId: string): Promise<CalendarEvent | null> {
  const [row] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, eventId)).limit(1);
  return row ?? null;
}
