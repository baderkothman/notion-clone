import { randomUUID, randomBytes } from "node:crypto";

/** UUIDv4 for primary keys — matches Postgres `uuid` columns. */
export function newId(): string {
  return randomUUID();
}

/**
 * URL-safe random token for things that must be unguessable and are NOT database
 * primary keys (invite tokens, public share slugs, file object keys). Never derive
 * these from predictable input (user id, timestamp) — see docs/SECURITY.md.
 */
export function newToken(bytes = 32): string {
  return randomBytes(bytes).toString("base64url");
}
