import "server-only";
import { db, pages, databaseProperties, databaseRowValues, eq, and, asc, inArray } from "@notion-clone/database";
import { setRowValueSchema, type SetRowValueInput } from "@notion-clone/contracts";
import { ValidationError } from "@notion-clone/shared";
import { createPage } from "../pages/create";
import { assertPagePermission } from "../permissions/assert";

/** A database row is an ordinary page (parentId = the database page) — see
 * packages/database/src/schema/databases.ts for why. Creating one reuses the same page
 * creation path everything else uses. */
export async function createRow(userId: string, databasePageId: string, workspaceId: string) {
  return createPage(userId, { workspaceId, parentId: databasePageId, type: "page" });
}

/** Rows + all their property values in two queries total (not one query per row). */
export async function listRows(userId: string, databasePageId: string) {
  await assertPagePermission(userId, databasePageId, "view");

  const rows = await db
    .select({ id: pages.id, title: pages.title, icon: pages.icon, sortKey: pages.sortKey })
    .from(pages)
    .where(and(eq(pages.parentId, databasePageId), eq(pages.isArchived, false)))
    .orderBy(asc(pages.sortKey));

  const rowIds = rows.map((r) => r.id);
  const values = rowIds.length
    ? await db.select().from(databaseRowValues).where(inArray(databaseRowValues.rowPageId, rowIds))
    : [];

  return { rows, values };
}

export async function setRowValue(userId: string, raw: SetRowValueInput) {
  const input = setRowValueSchema.parse(raw);
  await assertPagePermission(userId, input.rowPageId, "edit");

  const [property] = await db.select().from(databaseProperties).where(eq(databaseProperties.id, input.propertyId)).limit(1);
  if (!property) throw new ValidationError("Property not found.");

  await db
    .insert(databaseRowValues)
    .values({ rowPageId: input.rowPageId, propertyId: input.propertyId, value: input.value })
    .onConflictDoUpdate({
      target: [databaseRowValues.rowPageId, databaseRowValues.propertyId],
      set: { value: input.value, updatedAt: new Date() },
    });
}
