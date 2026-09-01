"use server";

import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import { mintRealtimeToken } from "@/server/realtime/mint-token";

/** Mints a fresh short-lived token authorizing the current user to join `pageId`'s
 * live-collaboration room. Called once on mount and re-called on every reconnect —
 * tokens expire in 60s, so the client never reuses one across connection attempts. */
export async function mintRealtimeTokenAction(pageId: string) {
  const userId = await requireUserId();
  return runAction(() => mintRealtimeToken(userId, pageId));
}
