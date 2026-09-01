"use server";

import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import { fetchLinkMetadata } from "@/server/embeds/fetch-link-metadata";
import { fetchLinkMetadataSchema, type FetchLinkMetadataInput } from "@notion-clone/contracts";
import { checkRateLimit } from "@notion-clone/shared";

export async function fetchLinkMetadataAction(raw: FetchLinkMetadataInput) {
  const userId = await requireUserId();
  const input = fetchLinkMetadataSchema.parse(raw);

  const limit = checkRateLimit(`embed:${userId}`, { max: 20, windowMs: 60_000 });
  if (!limit.allowed) {
    return { ok: false as const, error: "You're embedding links too quickly. Try again in a moment." };
  }

  return runAction(() => fetchLinkMetadata(input.url));
}
