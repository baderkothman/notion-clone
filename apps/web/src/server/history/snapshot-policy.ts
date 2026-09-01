import "server-only";
import { db, pageRevisions, pages, eq, desc } from "@notion-clone/database";
import type { JSONContent } from "@notion-clone/contracts";

/** Minimum gap between automatic snapshots for the same page. Keeps the revisions table
 * from growing one row per autosave (which fires every few seconds of active editing)
 * while still giving a meaningful "restore to N minutes ago" granularity. A dedicated
 * pruning job (documented in docs/DATABASE.md) can later thin older snapshots further
 * (e.g. hourly beyond 24h, daily beyond 30 days) — not needed yet at phase-1 scale. */
const SNAPSHOT_INTERVAL_MS = 5 * 60 * 1000;

export async function maybeSnapshot(pageId: string, userId: string, content: JSONContent) {
  const [latest] = await db
    .select({ createdAt: pageRevisions.createdAt })
    .from(pageRevisions)
    .where(eq(pageRevisions.pageId, pageId))
    .orderBy(desc(pageRevisions.createdAt))
    .limit(1);

  const dueForSnapshot = !latest || Date.now() - latest.createdAt.getTime() > SNAPSHOT_INTERVAL_MS;
  if (!dueForSnapshot) return;

  const [page] = await db.select({ title: pages.title }).from(pages).where(eq(pages.id, pageId)).limit(1);
  if (!page) return;

  await db.insert(pageRevisions).values({
    pageId,
    title: page.title,
    content,
    createdByUserId: userId,
  });
}
