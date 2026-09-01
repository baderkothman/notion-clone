import "server-only";
import { isIP } from "node:net";
import dns from "node:dns/promises";
import { ValidationError } from "@notion-clone/shared";

/**
 * Blocks the classic SSRF targets for any server-initiated fetch of a user-supplied URL
 * (bookmark embeds today; anything else that fetches-by-URL later should reuse this).
 * Checked against BOTH the literal hostname (in case it's already an IP) and every
 * resolved address (DNS rebinding: a hostname that resolves to a private IP) — see
 * docs/SECURITY.md "URL processing".
 */
const BLOCKED_V4_RANGES: [string, number][] = [
  ["0.0.0.0", 8],
  ["10.0.0.0", 8],
  ["100.64.0.0", 10], // carrier-grade NAT
  ["127.0.0.0", 8],
  ["169.254.0.0", 16], // link-local + cloud metadata (169.254.169.254)
  ["172.16.0.0", 12],
  ["192.0.0.0", 24],
  ["192.168.0.0", 16],
  ["198.18.0.0", 15],
  ["224.0.0.0", 4],
];

function ipToInt(ip: string): number {
  return ip.split(".").reduce((acc, part) => (acc << 8) + Number(part), 0) >>> 0;
}

function isBlockedV4(ip: string): boolean {
  const ipInt = ipToInt(ip);
  return BLOCKED_V4_RANGES.some(([base, bits]) => {
    const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
    return (ipInt & mask) === (ipToInt(base) & mask);
  });
}

function isBlockedV6(ip: string): boolean {
  const lower = ip.toLowerCase();
  return (
    lower === "::1" || // loopback
    lower.startsWith("fe80:") || // link-local
    lower.startsWith("fc") ||
    lower.startsWith("fd") || // unique local
    lower.startsWith("::ffff:127.") ||
    lower.startsWith("::ffff:169.254.")
  );
}

function isBlockedAddress(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return isBlockedV4(ip);
  if (version === 6) return isBlockedV6(ip);
  return true; // unrecognized — fail closed
}

export async function assertSafeExternalUrl(rawUrl: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new ValidationError("That doesn't look like a valid URL.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new ValidationError("Only http and https links are supported.");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname === "metadata.google.internal") {
    throw new ValidationError("This URL can't be embedded.");
  }

  if (isIP(hostname)) {
    if (isBlockedAddress(hostname)) throw new ValidationError("This URL can't be embedded.");
    return url;
  }

  let addresses: string[];
  try {
    const records = await dns.lookup(hostname, { all: true });
    addresses = records.map((r) => r.address);
  } catch {
    throw new ValidationError("Couldn't resolve that URL.");
  }

  if (addresses.length === 0 || addresses.some(isBlockedAddress)) {
    throw new ValidationError("This URL can't be embedded.");
  }

  return url;
}
