import "server-only";
import { db, documents, pages, pageRevisions, eq, sql } from "@notion-clone/database";
import { NotFoundError } from "@notion-clone/shared";
import { assertPagePermission } from "../permissions/assert";
import { indexPageBody, indexPageTitle } from "../search/index-page";

/** Restoring always snapshots the current (pre-restore) state first, so restoring is
 * itself undoable by restoring again. */
export async function restoreRevision(userId: string, pageId: string, revisionId: string) {
  await assertPagePermission(userId, pageId, "edit");

  const [revision] = await db.select().from(pageRevisions).where(eq(pageRevisions.id, revisionId)).limit(1);
  if (!revision || revision.pageId !== pageId) throw new NotFoundError("Revision");

  const [current] = await db.select().from(documents).where(eq(documents.pageId, pageId)).limit(1);
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  if (!current || !page) throw new NotFoundError("Page");

  await db.insert(pageRevisions).values({
    pageId,
    title: page.title,
    content: current.content,
    createdByUserId: userId,
  });

  await db
    .update(documents)
    .set({ content: revision.content, version: sql`${documents.version} + 1`, updatedByUserId: userId, updatedAt: new Date() })
    .where(eq(documents.pageId, pageId));

  await db.update(pages).set({ title: revision.title, updatedAt: new Date(), lastEditedByUserId: userId }).where(eq(pages.id, pageId));

  await indexPageTitle(pageId, revision.title);
  await indexPageBody(pageId, revision.content);
}
