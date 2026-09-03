import "server-only";
import { google, type Auth } from "googleapis";

// `googleapis` re-exports google-auth-library's types as its own `Auth` namespace —
// importing the type through here (not from "google-auth-library" directly) matters
// under pnpm's strict node_modules: apps/web depends on "googleapis", not on
// "google-auth-library" itself, which is only googleapis' own transitive dependency and
// isn't resolvable as a direct import from this package.
type OAuth2Client = Auth.OAuth2Client;
import { db, googleCalendarConnections, eq } from "@notion-clone/database";
import { encryptSecret, decryptSecret, ExternalServiceError } from "@notion-clone/shared";
import { GOOGLE_OAUTH_SCOPES } from "@notion-clone/contracts";
import { getGoogleClientId, getGoogleClientSecret, getGoogleRedirectUri, getTokenEncryptionKey } from "./env";
import type { GoogleCalendarConnection } from "./queries";

/** Only `apps/web` depends on `googleapis` (not `packages/*`) — same isolation as the
 * S3 SDK (see s3-client.ts): a provider-specific client library never leaks into
 * package-level code that other consumers (apps/realtime, tests) shouldn't need to
 * pull in. */
export function createOAuth2Client(): OAuth2Client {
  return new google.auth.OAuth2(getGoogleClientId(), getGoogleClientSecret(), getGoogleRedirectUri());
}

/** `access_type: "offline"` is what makes Google issue a `refresh_token` at all — a
 * default ("online") grant only returns a short-lived access token, useless for a
 * background sync that must keep working after the user closes the tab. `prompt:
 * "consent"` forces Google to show the consent screen (and therefore issue a fresh
 * refresh_token) even on a *re*-connect — without it, Google silently omits
 * `refresh_token` on a second authorization for the same client+user, which would leave
 * a reconnect after a revoke with no way to sync at all. */
export function buildAuthorizeUrl(state: string): string {
  const client = createOAuth2Client();
  return client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GOOGLE_OAUTH_SCOPES],
    state,
  });
}

export async function exchangeCodeForTokens(code: string) {
  const client = createOAuth2Client();
  const { tokens } = await client.getToken(code);
  if (!tokens.access_token || !tokens.refresh_token || !tokens.expiry_date) {
    // Missing refresh_token here almost always means `prompt: "consent"` above didn't
    // actually re-trigger consent (e.g. a stale authorize URL reused across sessions) —
    // surfacing this as a clear error beats silently storing a connection that can
    // never refresh itself.
    throw new ExternalServiceError(
      "Google did not grant offline access. Please try connecting again.",
    );
  }
  return tokens;
}

/** Returns a ready-to-use, guaranteed-fresh OAuth2Client for this connection —
 * decrypts the stored tokens, and if the access token is expired/near-expiry,
 * refreshes it (googleapis does this transparently inside `getAccessToken()`) and
 * persists the rotated token back to the database before returning. Every call site
 * that's about to hit the Calendar API goes through this rather than reading
 * `connection.accessToken` directly. */
export async function getAuthorizedClient(connection: GoogleCalendarConnection): Promise<OAuth2Client> {
  const key = getTokenEncryptionKey();
  const client = createOAuth2Client();
  const originalAccessToken = decryptSecret(connection.accessToken, key);
  client.setCredentials({
    access_token: originalAccessToken,
    refresh_token: decryptSecret(connection.refreshToken, key),
    expiry_date: connection.expiresAt.getTime(),
  });

  let accessToken: string | null | undefined;
  try {
    ({ token: accessToken } = await client.getAccessToken());
  } catch {
    // A revoked/expired refresh token surfaces here (Google returns `invalid_grant`).
    // Mark the connection so Settings can tell the user to reconnect, instead of every
    // sync attempt failing silently forever.
    await db
      .update(googleCalendarConnections)
      .set({
        status: "revoked",
        lastErrorMessage: "Google access was revoked or expired. Reconnect your account.",
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarConnections.id, connection.id));
    throw new ExternalServiceError("Google access was revoked or expired. Reconnect your account.");
  }

  if (!accessToken) {
    throw new ExternalServiceError("Google did not return a valid access token.");
  }

  if (accessToken !== originalAccessToken) {
    // The token was actually rotated — persist it (encrypted) so the *next* call
    // doesn't need to refresh again, and so a concurrent request reads the current
    // token rather than one Google has already invalidated.
    await db
      .update(googleCalendarConnections)
      .set({
        accessToken: encryptSecret(accessToken, key),
        expiresAt: new Date(client.credentials.expiry_date ?? Date.now() + 55 * 60 * 1000),
        status: "connected",
        lastErrorMessage: null,
        updatedAt: new Date(),
      })
      .where(eq(googleCalendarConnections.id, connection.id));
  }

  return client;
}
