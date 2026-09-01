import "server-only";
import { db, databaseViews, eq, desc } from "@notion-clone/database";
import {
  createViewSchema,
  updateViewSchema,
  type CreateViewInput,
  type UpdateViewInput,
} from "@notion-clone/contracts";
import { ValidationError } from "@notion-clone/shared";
import { assertPagePermission } from "../permissions/assert";

export async function listViews(userId: string, databasePageId: string) {
  await assertPagePermission(userId, databasePageId, "view");
  return db.select().from(databaseViews).where(eq(databaseViews.databasePageId, databasePageId)).orderBy(databaseViews.position);
}

export async function createView(userId: string, raw: CreateViewInput) {
  const input = createViewSchema.parse(raw);
  await assertPagePermission(userId, input.databasePageId, "edit");

  const [last] = await db
    .select({ position: databaseViews.position })
    .from(databaseViews)
    .where(eq(databaseViews.databasePageId, input.databasePageId))
    .orderBy(desc(databaseViews.position))
    .limit(1);

  const [view] = await db
    .insert(databaseViews)
    .values({
      databasePageId: input.databasePageId,
      name: input.name,
      type: input.type,
      position: (last?.position ?? -1) + 1,
      config: { filters: [], sorts: [] },
    })
    .returning();
  return view;
}

export async function updateView(userId: string, raw: UpdateViewInput) {
  const input = updateViewSchema.parse(raw);
  const [view] = await db.select().from(databaseViews).where(eq(databaseViews.id, input.viewId)).limit(1);
  if (!view) throw new ValidationError("View not found.");
  await assertPagePermission(userId, view.databasePageId, "edit");

  await db
    .update(databaseViews)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.config !== undefined ? { config: { ...view.config, ...input.config } } : {}),
    })
    .where(eq(databaseViews.id, input.viewId));
}
