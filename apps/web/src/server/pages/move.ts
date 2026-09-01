import "server-only";
import { db, pages, eq, sql } from "@notion-clone/database";
import { movePageSchema, type MovePageInput } from "@notion-clone/contracts";
import { ValidationError, NotFoundError } from "@notion-clone/shared";
import { sortKeyBetween } from "@notion-clone/shared";
import { assertPagePermission } from "../permissions/assert";

/** True if `candidateAncestorId` is `pageId` itself or one of its descendants — moving a
 * page under its own descendant would create a cycle in the tree. */
async function wouldCreateCycle(pageId: string, candidateAncestorId: string): Promise<boolean> {
  if (pageId === candidateAncestorId) return true;
  const rows = await db.execute<{ [key: string]: unknown; id: string }>(sql`
    WITH RECURSIVE descendants AS (
      SELECT id FROM pages WHERE parent_id = ${pageId}
      UNION ALL
      SELECT p.id FROM pages p INNER JOIN descendants d ON p.parent_id = d.id
    )
    SELECT id FROM descendants WHERE id = ${candidateAncestorId}
  `);
  return rows.length > 0;
}

export async function movePage(userId: string, raw: MovePageInput) {
  const input = movePageSchema.parse(raw);
  await assertPagePermission(userId, input.pageId, "edit");

  const [page] = await db.select().from(pages).where(eq(pages.id, input.pageId)).limit(1);
  if (!page) throw new NotFoundError("Page");

  if (input.newParentId) {
    if (await wouldCreateCycle(input.pageId, input.newParentId)) {
      throw new ValidationError("You can't move a page into one of its own sub-pages.");
    }
    await assertPagePermission(userId, input.newParentId, "edit");
  }

  const newSortKey = sortKeyBetween(input.afterSortKey ?? null, input.beforeSortKey ?? null);

  await db
    .update(pages)
    .set({
      parentId: input.newParentId,
      workspaceId: page.workspaceId, // pages never move across workspaces
      sortKey: newSortKey,
      updatedAt: new Date(),
      lastEditedByUserId: userId,
    })
    .where(eq(pages.id, input.pageId));
}
