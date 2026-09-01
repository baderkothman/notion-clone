import "server-only";
import {
  db,
  pages,
  pageShares,
  favorites,
  documents,
  eq,
  and,
  isNull,
  or,
  desc,
  asc,
  sql,
} from "@notion-clone/database";
import { getWorkspaceRole } from "../permissions/workspace-role";
import { assertPagePermission } from "../permissions/assert";
import type { PageTreeNode } from "@notion-clone/contracts";

const pageColumns = {
  id: pages.id,
  title: pages.title,
  icon: pages.icon,
  type: pages.type,
  parentId: pages.parentId,
  isArchived: pages.isArchived,
  sortKey: pages.sortKey,
};

/** Children of `parentId` (or top-level pages when null) that `userId` can see.
 * Top-level pages are filtered explicitly (creator, workspace-visible, or explicitly
 * shared); once a parent is accessible, its non-archived children are guaranteed
 * accessible by the inheritance rule in permissions/resolve-core.ts, so no per-child
 * check is needed there. */
export async function listChildPages(
  userId: string,
  workspaceId: string,
  parentId: string | null,
): Promise<PageTreeNode[]> {
  let rows;

  if (parentId === null) {
    const role = await getWorkspaceRole(userId, workspaceId);
    if (!role) return [];
    rows = await db
      .select(pageColumns)
      .from(pages)
      .leftJoin(
        pageShares,
        and(eq(pageShares.pageId, pages.id), eq(pageShares.userId, userId)),
      )
      .where(
        and(
          eq(pages.workspaceId, workspaceId),
          isNull(pages.parentId),
          eq(pages.isArchived, false),
          or(
            eq(pages.createdByUserId, userId),
            role !== "guest" ? eq(pages.visibility, "workspace") : sql`false`,
            sql`${pageShares.id} IS NOT NULL`,
          ),
        ),
      )
      .orderBy(asc(pages.sortKey));
  } else {
    await assertPagePermission(userId, parentId, "view");
    rows = await db
      .select(pageColumns)
      .from(pages)
      .where(and(eq(pages.parentId, parentId), eq(pages.isArchived, false)))
      .orderBy(asc(pages.sortKey));
  }

  const ids = rows.map((r) => r.id);
  const childCounts = ids.length
    ? await db
        .select({ parentId: pages.parentId, count: sql<number>`count(*)::int` })
        .from(pages)
        .where(and(sql`${pages.parentId} IN ${ids}`, eq(pages.isArchived, false)))
        .groupBy(pages.parentId)
    : [];
  const hasChildrenSet = new Set(childCounts.map((c) => c.parentId));

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    icon: r.icon,
    type: r.type,
    parentId: r.parentId,
    isArchived: r.isArchived,
    hasChildren: hasChildrenSet.has(r.id),
    sortKey: r.sortKey,
  }));
}

export async function getPageWithDocument(userId: string, pageId: string) {
  await assertPagePermission(userId, pageId, "view");
  const [page] = await db.select().from(pages).where(eq(pages.id, pageId)).limit(1);
  if (!page) return null;
  const [document] = await db
    .select()
    .from(documents)
    .where(eq(documents.pageId, pageId))
    .limit(1);
  return { page, document: document ?? null };
}

export async function listFavorites(userId: string, workspaceId: string) {
  return db
    .select({
      id: pages.id,
      title: pages.title,
      icon: pages.icon,
      type: pages.type,
      parentId: pages.parentId,
    })
    .from(favorites)
    .innerJoin(pages, eq(pages.id, favorites.pageId))
    .where(
      and(
        eq(favorites.userId, userId),
        eq(pages.workspaceId, workspaceId),
        eq(pages.isArchived, false),
      ),
    )
    .orderBy(desc(favorites.createdAt));
}

export async function listTrash(userId: string, workspaceId: string) {
  // A user's trash shows what THEY archived (or created and is now archived) — not
  // every archived page in the workspace, which could leak other members' private pages.
  return db
    .select({
      id: pages.id,
      title: pages.title,
      icon: pages.icon,
      type: pages.type,
      archivedAt: pages.archivedAt,
    })
    .from(pages)
    .where(
      and(
        eq(pages.workspaceId, workspaceId),
        eq(pages.isArchived, true),
        or(eq(pages.createdByUserId, userId), eq(pages.archivedByUserId, userId)),
      ),
    )
    .orderBy(desc(pages.archivedAt));
}

export async function getBreadcrumbs(pageId: string) {
  const rows = await db.execute<{ [key: string]: unknown; id: string; title: string; icon: string | null; depth: number }>(sql`
    WITH RECURSIVE ancestors AS (
      SELECT id, title, icon, parent_id, 0 AS depth FROM pages WHERE id = ${pageId}
      UNION ALL
      SELECT p.id, p.title, p.icon, p.parent_id, a.depth + 1
      FROM pages p INNER JOIN ancestors a ON p.id = a.parent_id
    )
    SELECT id, title, icon, depth FROM ancestors ORDER BY depth DESC
  `);
  return rows;
}
