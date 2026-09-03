import "server-only";
import { db, googleCalendarConnections, eq } from "@notion-clone/database";

// `$inferSelect` (Drizzle's own table-attached type helper) avoids importing from
// "drizzle-orm" directly here — apps/web depends on @notion-clone/database, not on
// drizzle-orm itself, and pnpm's strict node_modules doesn't guarantee a phantom
// transitive import like that resolves.
export type GoogleCalendarConnection = typeof googleCalendarConnections.$inferSelect;

export async function getGoogleConnectionByUserId(userId: string): Promise<GoogleCalendarConnection | null> {
  const [row] = await db
    .select()
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.userId, userId))
    .limit(1);
  return row ?? null;
}

export async function getGoogleConnectionById(connectionId: string): Promise<GoogleCalendarConnection | null> {
  const [row] = await db
    .select()
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.id, connectionId))
    .limit(1);
  return row ?? null;
}

export async function getGoogleConnectionByWorkspaceId(
  workspaceId: string,
): Promise<GoogleCalendarConnection | null> {
  const [row] = await db
    .select()
    .from(googleCalendarConnections)
    .where(eq(googleCalendarConnections.workspaceId, workspaceId))
    .limit(1);
  return row ?? null;
}
