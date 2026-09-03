import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * AES-256-GCM encryption for secrets we must store (Google OAuth access/refresh
 * tokens — see apps/web/src/server/integrations/google-calendar) but never want to sit
 * in the database as plaintext, unlike the Auth.js adapter's `accounts` table shape
 * (schema/identity.ts), which stores provider tokens unencrypted per the standard
 * adapter contract. This is a deliberately separate, stricter path — see
 * docs/SECURITY.md "Integration token storage".
 *
 * Not used for passwords (those are bcrypt-hashed one-way, never decrypted — see
 * packages/auth/src/password.ts) or for any Auth.js-managed identity token.
 */

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // GCM's recommended nonce length
const AUTH_TAG_LENGTH = 16;
const SALT = "notion-clone-token-encryption"; // static, non-secret — see key derivation note below

function deriveKey(secret: string): Buffer {
  // scryptSync with a static, non-secret salt is fine here: the input keying material
  // (GOOGLE_TOKEN_ENCRYPTION_KEY) is itself a high-entropy 32-byte random secret, not a
  // user-chosen password — the salt's job in that threat model is only to produce a
  // key of the right length/shape, not to defeat dictionary attacks against a weak
  // secret. A random per-value salt would need to be stored alongside every ciphertext
  // for no real security benefit here.
  return scryptSync(secret, SALT, 32);
}

/** Encrypts `plaintext` with `GOOGLE_TOKEN_ENCRYPTION_KEY`-derived AES-256-GCM. Returns
 * a single base64 string (iv || authTag || ciphertext) safe to store in a text column. */
export function encryptSecret(plaintext: string, secret: string): string {
  const key = deriveKey(secret);
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, ciphertext]).toString("base64");
}

/** Inverse of `encryptSecret`. Throws if the payload is malformed or the auth tag
 * doesn't verify (tampered ciphertext or wrong key) — never returns a partial/garbage
 * result silently. */
export function decryptSecret(payload: string, secret: string): string {
  const key = deriveKey(secret);
  const raw = Buffer.from(payload, "base64");
  if (raw.length < IV_LENGTH + AUTH_TAG_LENGTH) {
    throw new Error("Malformed encrypted payload.");
  }
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
