"use server";

import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import { searchProvider } from "@/server/search/postgres-search-provider";
import type { SearchInput } from "@notion-clone/contracts";
import { checkRateLimit } from "@notion-clone/shared";

export async function searchAction(input: SearchInput) {
  const userId = await requireUserId();
  const limit = checkRateLimit(`search:${userId}`, { max: 30, windowMs: 60_000 });
  if (!limit.allowed) {
    return { ok: false as const, error: "You're searching too quickly. Try again in a moment." };
  }
  return runAction(() => searchProvider.search({ ...input, requesterId: userId }));
}
