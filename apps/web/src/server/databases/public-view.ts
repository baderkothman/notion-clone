import "server-only";
import { db, pages, databaseProperties, databaseRowValues, databaseViews, eq, and, asc, inArray } from "@notion-clone/database";

/**
 * No permission check — callers must only reach this after `getPageByPublicToken` (see
 * server/sharing/public-view.ts) has already confirmed the page is a currently
 * publicly-shared database. Same "the token is the authorization" pattern as the
 * page-level public view.
 */
export async function getPublicDatabaseData(databasePageId: string) {
  const [properties, views, rows] = await Promise.all([
    db.select().from(databaseProperties).where(eq(databaseProperties.databasePageId, databasePageId)).orderBy(asc(databaseProperties.position)),
    db.select().from(databaseViews).where(eq(databaseViews.databasePageId, databasePageId)).orderBy(asc(databaseViews.position)),
    db
      .select({ id: pages.id, title: pages.title, icon: pages.icon, sortKey: pages.sortKey })
      .from(pages)
      .where(and(eq(pages.parentId, databasePageId), eq(pages.isArchived, false)))
      .orderBy(asc(pages.sortKey)),
  ]);

  const rowIds = rows.map((r) => r.id);
  const values = rowIds.length
    ? await db.select().from(databaseRowValues).where(inArray(databaseRowValues.rowPageId, rowIds))
    : [];

  return { properties, views, rows, values };
}
