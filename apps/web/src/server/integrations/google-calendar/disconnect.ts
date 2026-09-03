import "server-only";
import { db, googleCalendarConnections, calendarEvents, eq } from "@notion-clone/database";
import { decryptSecret, ValidationError } from "@notion-clone/shared";
import { createOAuth2Client } from "./client";
import { getTokenEncryptionKey } from "./env";
import { getGoogleConnectionByUserId } from "./queries";

/**
 * Disconnects the user's Google account: revokes the token with Google (so the grant
 * disappears from the user's Google Account permissions page too, not just our side —
 * a user who disconnects here reasonably expects it to also be gone from Google's own
 * "third-party access" list), then deletes the connection row.
 *
 * Every `calendar_events` row that referenced this connection is explicitly detached
 * (rather than relying only on the FK's `ON DELETE SET NULL`) so its sync bookkeeping
 * — `googleEventId`/`googleEtag`/`syncStatus` — doesn't linger in a stale "synced" state
 * pointing at a connection that no longer exists. The events themselves are kept, not
 * deleted: disconnecting Google shouldn't destroy content the user created in this app.
 */
export async function disconnectGoogleCalendar(userId: string): Promise<void> {
  const connection = await getGoogleConnectionByUserId(userId);
  if (!connection) throw new ValidationError("No Google account is connected.");

  try {
    const key = getTokenEncryptionKey();
    const client = createOAuth2Client();
    await client.revokeToken(decryptSecret(connection.refreshToken, key));
  } catch {
    // Best-effort — if Google's revoke endpoint is unreachable or the token is already
    // invalid, we still want to remove our own record of the connection rather than
    // leave the user stuck "connected" to something that no longer works.
  }

  await db.transaction(async (tx) => {
    await tx
      .update(calendarEvents)
      .set({
        googleConnectionId: null,
        googleEventId: null,
        googleEtag: null,
        googleRecurringEventId: null,
        syncStatus: "local",
        syncError: null,
        updatedAt: new Date(),
      })
      .where(eq(calendarEvents.googleConnectionId, connection.id));

    await tx.delete(googleCalendarConnections).where(eq(googleCalendarConnections.id, connection.id));
  });
}
