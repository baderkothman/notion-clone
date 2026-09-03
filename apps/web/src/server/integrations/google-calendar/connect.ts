import "server-only";
import { google } from "googleapis";
import { db, googleCalendarConnections, eq } from "@notion-clone/database";
import { encryptSecret, ExternalServiceError, ValidationError } from "@notion-clone/shared";
import type { SelectGoogleCalendarInput } from "@notion-clone/contracts";
import { buildAuthorizeUrl, exchangeCodeForTokens, getAuthorizedClient, createOAuth2Client } from "./client";
import { getTokenEncryptionKey } from "./env";
import { signOAuthState, verifyOAuthState } from "./state";
import { getGoogleConnectionByUserId, getGoogleConnectionById } from "./queries";

/** Step 1 of the OAuth flow — called by the `/api/integrations/google/authorize`
 * route. Returns the Google consent-screen URL to redirect the browser to. `workspaceId`
 * is the workspace this connection will belong to (see schema/calendar.ts) — bound into
 * the signed state, not trusted from the callback's own query params. */
export function startGoogleConnect(userId: string, workspaceId: string): string {
  return buildAuthorizeUrl(signOAuthState({ userId, workspaceId }));
}

/**
 * Step 2 — called by the `/api/integrations/google/callback` route with the `code`
 * and `state` query params Google appends to its redirect. Verifies `state` (CSRF —
 * see state.ts) matches the session that started the flow, exchanges the code for
 * tokens, fetches the account's email (for display) and calendar list, and upserts the
 * connection row. One connection per user (re-connecting — even from a different
 * workspace — replaces the existing row rather than creating a second one, moving it
 * to the new workspace; see the schema's `userId` unique constraint and its doc
 * comment on why one Google account maps to one workspace at a time).
 */
export async function completeGoogleConnect(
  sessionUserId: string,
  code: string,
  state: string,
): Promise<{ googleAccountEmail: string }> {
  const statePayload = verifyOAuthState(state);
  if (!statePayload || statePayload.userId !== sessionUserId) {
    throw new ValidationError("This connection request expired or wasn't started from this session. Try again.");
  }
  const { workspaceId } = statePayload;

  const tokens = await exchangeCodeForTokens(code);
  const key = getTokenEncryptionKey();

  const client = createOAuth2Client();
  client.setCredentials(tokens);
  const oauth2 = google.oauth2({ auth: client, version: "v2" });
  const { data: profile } = await oauth2.userinfo.get();
  if (!profile.email) {
    throw new ExternalServiceError("Google did not return an account email.");
  }

  const existing = await getGoogleConnectionByUserId(sessionUserId);
  const values = {
    userId: sessionUserId,
    workspaceId,
    googleAccountEmail: profile.email,
    accessToken: encryptSecret(tokens.access_token!, key),
    refreshToken: encryptSecret(tokens.refresh_token!, key),
    scope: tokens.scope ?? "",
    expiresAt: new Date(tokens.expiry_date!),
    status: "connected" as const,
    lastErrorMessage: null,
    // A reconnect keeps the previously selected calendar rather than resetting to
    // "primary" — the user already chose which calendar matters to them.
    googleCalendarId: existing?.googleCalendarId ?? "primary",
    // A fresh token grant invalidates any previous incremental-sync cursor.
    syncToken: null,
    updatedAt: new Date(),
  };

  if (existing) {
    await db.update(googleCalendarConnections).set(values).where(eq(googleCalendarConnections.id, existing.id));
  } else {
    await db.insert(googleCalendarConnections).values(values);
  }

  return { googleAccountEmail: profile.email };
}

export type GoogleCalendarListItem = { id: string; summary: string; primary: boolean };

/** Powers the "which calendar?" picker in Settings — a user may have several Google
 * calendars (personal, work, shared team calendars); we only ever sync one. */
export async function listGoogleCalendars(userId: string): Promise<GoogleCalendarListItem[]> {
  const connection = await getGoogleConnectionByUserId(userId);
  if (!connection) throw new ValidationError("No Google account is connected.");

  const client = await getAuthorizedClient(connection);
  const calendar = google.calendar({ version: "v3", auth: client });
  const { data } = await calendar.calendarList.list();
  const calendars: GoogleCalendarListItem[] = [];
  for (const item of data.items ?? []) {
    if (!item.id) continue;
    calendars.push({ id: item.id, summary: item.summary ?? item.id, primary: Boolean(item.primary) });
  }
  return calendars;
}

export async function selectGoogleCalendar(userId: string, input: SelectGoogleCalendarInput): Promise<void> {
  const connection = await getGoogleConnectionById(input.connectionId);
  if (!connection || connection.userId !== userId) {
    throw new ValidationError("No Google account is connected.");
  }
  await db
    .update(googleCalendarConnections)
    .set({ googleCalendarId: input.googleCalendarId, syncToken: null, updatedAt: new Date() })
    .where(eq(googleCalendarConnections.id, connection.id));
}
