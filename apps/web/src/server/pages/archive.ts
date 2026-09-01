import "server-only";
import { db, pages, eq, sql } from "@notion-clone/database";
import {
  archivePageSchema,
  restorePageSchema,
  deletePagePermanentlySchema,
  type ArchivePageInput,
  type RestorePageInput,
  type DeletePagePermanentlyInput,
} from "@notion-clone/contracts";
import { NotFoundError, ForbiddenError } from "@notion-clone/shared";
import { assertPagePermission } from "../permissions/assert";
import { removeFromSearchIndex } from "../search/index-page";

/** Archiving cascades to descendants (they move to Trash with their parent, matching
 * Notion) — enforced with one recursive UPDATE rather than walking in application code. */
export async function archivePage(userId: string, raw: ArchivePageInput) {
  const { pageId } = archivePageSchema.parse(raw);
  await assertPagePermission(userId, pageId, "edit");

  await db.execute(sql`
    WITH RECURSIVE subtree AS (
      SELECT id FROM pages WHERE id = ${pageId}
      UNION ALL
      SELECT p.id FROM pages p INNER JOIN subtree s ON p.parent_id = s.id
    )
    UPDATE pages SET is_archived = true, archived_at = now(), archived_by_user_id = ${userId}
    WHERE id IN (SELECT id FROM subtree)
  `);
}

export async function restorePage(userId: string, raw: RestorePageInput) {
  const { pageId } = restorePageSchema.parse(raw);
  await assertPagePermission(userId, pageId, "edit");

  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  if (!page) throw new NotFoundError("Page");

  // If the parent is also archived (or gone), restore to the top level instead of
  // resurrecting into a still-trashed parent.
  let restoredParentId = page.parentId;
  if (page.parentId) {
    const [parent] = await db.select().from(pages).where(eq(pages.id, page.parentId)).limit(1);
    if (!parent || parent.isArchived) restoredParentId = null;
  }

  await db
    .update(pages)
    .set({ isArchived: false, archivedAt: null, archivedByUserId: null, parentId: restoredParentId })
    .where(eq(pages.id, pageId));
}

export async function deletePagePermanently(userId: string, raw: DeletePagePermanentlyInput) {
  const { pageId } = deletePagePermanentlySchema.parse(raw);
  await assertPagePermission(userId, pageId, "full");

  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  if (!page) throw new NotFoundError("Page");
  if (!page.isArchived) {
    throw new ForbiddenError("Move the page to Trash before deleting it permanently.");
  }

  await removeFromSearchIndex(pageId);
  await db.delete(pages).where(eq(pages.id, pageId)); // cascades to documents/comments/shares/etc.
}
