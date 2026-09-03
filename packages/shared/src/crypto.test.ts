import { describe, expect, it } from "vitest";
import { encryptSecret, decryptSecret } from "./crypto";

const KEY = "test-encryption-key-not-for-production-use-only";
const OTHER_KEY = "a-completely-different-key-value";

describe("encryptSecret / decryptSecret", () => {
  it("round-trips a plaintext value", () => {
    const plaintext = "ya29.a0AfH6SMC-example-google-access-token";
    const encrypted = encryptSecret(plaintext, KEY);
    expect(decryptSecret(encrypted, KEY)).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    const encrypted = encryptSecret("", KEY);
    expect(decryptSecret(encrypted, KEY)).toBe("");
  });

  it("round-trips unicode content", () => {
    const plaintext = "token-with-emoji-🔐-and-ünïcode";
    const encrypted = encryptSecret(plaintext, KEY);
    expect(decryptSecret(encrypted, KEY)).toBe(plaintext);
  });

  it("produces different ciphertext for the same plaintext each time (random IV)", () => {
    const a = encryptSecret("same-value", KEY);
    const b = encryptSecret("same-value", KEY);
    expect(a).not.toBe(b);
  });

  it("fails to decrypt with the wrong key", () => {
    const encrypted = encryptSecret("secret-value", KEY);
    expect(() => decryptSecret(encrypted, OTHER_KEY)).toThrow();
  });

  it("fails to decrypt a tampered payload (auth tag check)", () => {
    const encrypted = encryptSecret("secret-value", KEY);
    const raw = Buffer.from(encrypted, "base64");
    raw[raw.length - 1] = raw[raw.length - 1]! ^ 0xff; // flip a byte in the ciphertext
    const tampered = raw.toString("base64");
    expect(() => decryptSecret(tampered, KEY)).toThrow();
  });

  it("rejects a malformed (too-short) payload", () => {
    expect(() => decryptSecret("dG9vc2hvcnQ=", KEY)).toThrow("Malformed encrypted payload.");
  });
});
