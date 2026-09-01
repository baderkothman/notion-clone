"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import { listRevisions, getRevision } from "@/server/history/queries";
import { restoreRevision } from "@/server/history/restore";

export async function listRevisionsAction(pageId: string) {
  const userId = await requireUserId();
  return runAction(() => listRevisions(userId, pageId));
}

export async function getRevisionAction(pageId: string, revisionId: string) {
  const userId = await requireUserId();
  return runAction(() => getRevision(userId, pageId, revisionId));
}

export async function restoreRevisionAction(pageId: string, revisionId: string) {
  const userId = await requireUserId();
  const result = await runAction(() => restoreRevision(userId, pageId, revisionId));
  revalidatePath(`/w`, "layout");
  return result;
}
