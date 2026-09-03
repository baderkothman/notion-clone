import "server-only";
import jwt from "jsonwebtoken";

/**
 * Signs/verifies the OAuth `state` parameter sent to Google and echoed back on the
 * callback — standard OAuth CSRF protection (without it, an attacker could trick a
 * victim's browser into completing *the attacker's* Google authorization on the
 * victim's account by crafting the callback URL directly). Binds the state to the
 * requesting user's id *and* the workspace the connect flow was started from — a
 * connection is workspace-scoped (see schema/calendar.ts's doc comment), so the
 * callback needs to know which workspace to attach it to, and that has to come from
 * this signed token, never from a client-supplied query param on the callback itself.
 *
 * Reuses AUTH_SECRET (already required app-wide, already a random 32-byte value —
 * see .env.example) rather than adding a dedicated env var for this second, unrelated
 * signing purpose: it's a short-lived (5 minute) CSRF nonce, not a long-lived credential,
 * and Auth.js's own JWT session cookie already trusts this same secret for a
 * higher-stakes purpose (the user's login session itself).
 */

const STATE_TTL_SECONDS = 300;

export type OAuthStatePayload = { userId: string; workspaceId: string };

function getSecret(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is not set.");
  return secret;
}

export function signOAuthState(payload: OAuthStatePayload): string {
  return jwt.sign({ ...payload, purpose: "google_calendar_connect" }, getSecret(), {
    expiresIn: STATE_TTL_SECONDS,
  });
}

/** Returns the bound `{ userId, workspaceId }`, or `null` if the token is missing,
 * expired, tampered, or was signed for a different purpose. Callers must still check
 * the returned userId matches the *current* session's user before trusting it — this
 * only proves the token wasn't forged/replayed past its TTL. */
export function verifyOAuthState(token: string): OAuthStatePayload | null {
  try {
    const payload = jwt.verify(token, getSecret());
    if (
      typeof payload === "object" &&
      payload.purpose === "google_calendar_connect" &&
      typeof payload.userId === "string" &&
      typeof payload.workspaceId === "string"
    ) {
      return { userId: payload.userId, workspaceId: payload.workspaceId };
    }
    return null;
  } catch {
    return null;
  }
}
