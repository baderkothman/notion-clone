import "server-only";
import jwt from "jsonwebtoken";
import type { RealtimeTokenPayload } from "@notion-clone/contracts";
import { assertPagePermission } from "../permissions/assert";

// Short enough that a leaked token has a small blast radius, and that reconnecting
// (which the client does automatically on every page load / socket drop) always
// re-checks current permissions rather than trusting a stale grant — see
// docs/ARCHITECTURE.md's "Real-time collaboration architecture".
const TOKEN_TTL_SECONDS = 60;

function getSecret(): string {
  const secret = process.env.REALTIME_JWT_SECRET;
  if (!secret) throw new Error("REALTIME_JWT_SECRET is not set.");
  return secret;
}

/** Verifies the caller can edit this page, then mints a short-lived token binding
 * `{ userId, pageId, role }` that the Hocuspocus server in apps/realtime checks in its
 * `onAuthenticate` hook. A client that merely knows a page's UUID can't join its
 * collaboration room — only a token minted by this function (i.e. after a real
 * permission check) is accepted. */
export async function mintRealtimeToken(userId: string, pageId: string): Promise<string> {
  await assertPagePermission(userId, pageId, "edit");
  const payload: RealtimeTokenPayload = { userId, pageId, role: "edit" };
  return jwt.sign(payload, getSecret(), { expiresIn: TOKEN_TTL_SECONDS });
}
