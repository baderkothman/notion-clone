import "server-only";
import { db, pages, documents, eq, and, isNull, desc } from "@notion-clone/database";
import { EMPTY_DOCUMENT, createPageSchema, type CreatePageInput } from "@notion-clone/contracts";
import { sortKeyBetween } from "@notion-clone/shared";
import { assertWorkspaceCapability, assertPagePermission } from "../permissions/assert";

async function lastSiblingSortKey(workspaceId: string, parentId: string | null) {
  const [row] = await db
    .select({ sortKey: pages.sortKey })
    .from(pages)
    .where(
      and(
        eq(pages.workspaceId, workspaceId),
        parentId ? eq(pages.parentId, parentId) : isNull(pages.parentId),
      ),
    )
    .orderBy(desc(pages.sortKey))
    .limit(1);
  return row?.sortKey ?? null;
}

export async function createPage(userId: string, raw: CreatePageInput) {
  const input = createPageSchema.parse(raw);

  if (input.parentId) {
    await assertPagePermission(userId, input.parentId, "edit");
  } else {
    await assertWorkspaceCapability(userId, input.workspaceId, "createPages");
  }

  const after = input.afterSortKey ?? (await lastSiblingSortKey(input.workspaceId, input.parentId ?? null));
  const sortKey = sortKeyBetween(after, null);

  return db.transaction(async (tx) => {
    const [page] = await tx
      .insert(pages)
      .values({
        workspaceId: input.workspaceId,
        parentId: input.parentId ?? null,
        type: input.type ?? "page",
        title: input.title ?? "",
        sortKey,
        createdByUserId: userId,
        lastEditedByUserId: userId,
      })
      .returning();
    if (!page) throw new Error("Failed to create page.");

    await tx.insert(documents).values({ pageId: page.id, content: EMPTY_DOCUMENT, updatedByUserId: userId });
    return page;
  });
}
