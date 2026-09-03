import "server-only";

/** Fails fast (not lazily deep inside a Google API call) with a message that names the
 * exact env var to set — same pattern as apps/web/src/server/realtime/mint-token.ts and
 * s3-client.ts's `getSecret`/config getters. */
function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set. See .env.example.`);
  return value;
}

export function getGoogleClientId(): string {
  return requireEnv("GOOGLE_CLIENT_ID");
}

export function getGoogleClientSecret(): string {
  return requireEnv("GOOGLE_CLIENT_SECRET");
}

/** Must exactly match an "Authorized redirect URI" configured on the Google Cloud
 * OAuth client — Google rejects the callback otherwise. Derived from APP_URL (already
 * required app-wide) rather than a separate env var, so there's one fewer place this
 * can drift out of sync with the deployment's actual origin. */
export function getGoogleRedirectUri(): string {
  const appUrl = requireEnv("APP_URL");
  return `${appUrl.replace(/\/$/, "")}/api/integrations/google/callback`;
}

export function getTokenEncryptionKey(): string {
  return requireEnv("GOOGLE_TOKEN_ENCRYPTION_KEY");
}

/** Whether the integration is configured at all — used to hide the "Connect Google
 * Calendar" UI entirely (rather than showing a button that 500s) on a deployment that
 * hasn't set up Google OAuth credentials yet. */
export function isGoogleCalendarConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}
