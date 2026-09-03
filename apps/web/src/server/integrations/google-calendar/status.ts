import "server-only";
import { assertWorkspaceCapability } from "../../permissions/assert";
import { getGoogleConnectionByWorkspaceId } from "./queries";
import { isGoogleCalendarConfigured } from "./env";

/** The safe-to-render shape of a connection — never includes the encrypted token
 * columns. Settings page + calendar page both read this instead of touching
 * `GoogleCalendarConnection` (the raw row type) directly. */
// `connected` is present (as a literal `false`) on *every* variant, not just the
// "actually connected" one — a discriminated union where one member is missing the
// discriminant entirely means `.connected` can't be read at all without first
// narrowing on `.configured`, which doesn't survive into a nested closure (a client
// component's event handlers) the way it does in the same linear function body. Giving
// every variant the same two discriminant fields keeps `status.connected` (and
// `status.configured`) safe to read anywhere this type flows.
export type GoogleIntegrationStatus =
  | { configured: false; connected: false }
  | { configured: true; connected: false }
  | {
      configured: true;
      connected: true;
      connectionId: string;
      googleAccountEmail: string;
      googleCalendarId: string;
      status: "connected" | "error" | "revoked";
      lastErrorMessage: string | null;
      lastSyncedAt: string | null;
    };

export async function getGoogleIntegrationStatus(userId: string, workspaceId: string): Promise<GoogleIntegrationStatus> {
  if (!isGoogleCalendarConfigured()) return { configured: false, connected: false };

  await assertWorkspaceCapability(userId, workspaceId, "useCalendar");
  const connection = await getGoogleConnectionByWorkspaceId(workspaceId);
  if (!connection) return { configured: true, connected: false };

  return {
    configured: true,
    connected: true,
    connectionId: connection.id,
    googleAccountEmail: connection.googleAccountEmail,
    googleCalendarId: connection.googleCalendarId,
    status: connection.status,
    lastErrorMessage: connection.lastErrorMessage,
    lastSyncedAt: connection.lastSyncedAt?.toISOString() ?? null,
  };
}
