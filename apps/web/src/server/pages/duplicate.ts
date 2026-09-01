import "server-only";
import { db, pages, documents, eq, desc, and } from "@notion-clone/database";
import { duplicatePageSchema, type DuplicatePageInput } from "@notion-clone/contracts";
import { NotFoundError } from "@notion-clone/shared";
import { sortKeyBetween } from "@notion-clone/shared";
import { assertPagePermission } from "../permissions/assert";

/** Duplicates a page and its full sub-tree. Shares/comments/history are intentionally
 * NOT copied — a duplicate is a fresh page, not a fork of another page's collaboration
 * state. */
export async function duplicatePage(userId: string, raw: DuplicatePageInput) {
  const { pageId } = duplicatePageSchema.parse(raw);
  await assertPagePermission(userId, pageId, "view");

  const [original] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  if (!original) throw new NotFoundError("Page");
  // Captured as plain locals (not accessed via `original.*` below) so the nested
  // `cloneSubtree` closure doesn't need TypeScript to carry the null-check narrowing
  // across a function boundary, which it doesn't do.
  const originalParentId = original.parentId;
  const originalWorkspaceId = original.workspaceId;

  const [lastSibling] = await db
    .select({ sortKey: pages.sortKey })
    .from(pages)
    .where(
      originalParentId ? and(eq(pages.parentId, originalParentId)) : and(eq(pages.workspaceId, originalWorkspaceId)),
    )
    .orderBy(desc(pages.sortKey))
    .limit(1);

  async function cloneSubtree(sourceId: string, newParentId: string | null, sortKey: string): Promise<string> {
    const [source] = await db.select().from(pages).where(eq(pages.id, sourceId)).limit(1);
    if (!source) throw new NotFoundError("Page");
    const [sourceDoc] = await db.select().from(documents).where(eq(documents.pageId, sourceId)).limit(1);

    const [clone] = await db
      .insert(pages)
      .values({
        workspaceId: source.workspaceId,
        parentId: newParentId,
        type: source.type,
        title: newParentId === originalParentId && sourceId === pageId ? `${source.title} (copy)` : source.title,
        icon: source.icon,
        coverImage: source.coverImage,
        sortKey,
        createdByUserId: userId,
        lastEditedByUserId: userId,
      })
      .returning();
    if (!clone) throw new Error("Failed to duplicate page.");

    await db.insert(documents).values({
      pageId: clone.id,
      content: sourceDoc?.content ?? { type: "doc", content: [{ type: "paragraph" }] },
      updatedByUserId: userId,
    });

    const children = await db.select().from(pages).where(eq(pages.parentId, sourceId));
    let childAfter: string | null = null;
    for (const child of children) {
      childAfter = sortKeyBetween(childAfter, null);
      await cloneSubtree(child.id, clone.id, childAfter);
    }

    return clone.id;
  }

  const newSortKey = sortKeyBetween(lastSibling?.sortKey ?? null, null);
  return cloneSubtree(pageId, originalParentId, newSortKey);
}
