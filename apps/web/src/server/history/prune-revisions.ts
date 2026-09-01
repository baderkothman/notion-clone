import "server-only";
import { db, pageRevisions, eq, inArray } from "@notion-clone/database";
import { idsToPrune } from "./prune-revisions-core";

/**
 * Thins a page's revision history so it doesn't grow unboundedly for a page that's
 * edited constantly over months — see prune-revisions-core.ts for the actual bucketing
 * policy. Called opportunistically after each new snapshot (see snapshot-policy.ts)
 * rather than on a schedule — no cron/queue infrastructure needed, and the cost is
 * proportional to one page's own (already-throttled, so bounded) revision count.
 */
export async function pruneRevisions(pageId: string): Promise<void> {
  const revisions = await db
    .select({ id: pageRevisions.id, createdAt: pageRevisions.createdAt })
    .from(pageRevisions)
    .where(eq(pageRevisions.pageId, pageId));

  const toDelete = idsToPrune(revisions, Date.now());
  if (toDelete.length > 0) {
    await db.delete(pageRevisions).where(inArray(pageRevisions.id, toDelete));
  }
}
