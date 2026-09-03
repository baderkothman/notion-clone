import "server-only";
import { db, databaseProperties, databaseRowValues, pages, eq, desc } from "@notion-clone/database";
import {
  createPropertySchema,
  updatePropertySchema,
  deletePropertySchema,
  DEFAULT_STATUS_OPTION_NAMES,
  STATUS_CATEGORY_META,
  type CreatePropertyInput,
  type UpdatePropertyInput,
  type DeletePropertyInput,
  type SelectOption,
} from "@notion-clone/contracts";
import { ValidationError, newId } from "@notion-clone/shared";
import { assertPagePermission } from "../permissions/assert";

/** A fresh `status` property starts as an immediately-usable 3-stage workflow (see
 * `DEFAULT_STATUS_OPTION_NAMES`'s doc comment) instead of the empty option list a
 * plain `select`/`multi_select` starts with — a Board grouped by it is a real kanban
 * from the moment it's created, not a blank column-less grid the user has to
 * configure first. */
export function defaultStatusOptions(): SelectOption[] {
  return DEFAULT_STATUS_OPTION_NAMES.map(({ name, category }) => ({
    id: newId(),
    name,
    color: STATUS_CATEGORY_META[category].color,
    category,
  }));
}

async function assertIsDatabase(userId: string, databasePageId: string, minimum: "view" | "edit") {
  await assertPagePermission(userId, databasePageId, minimum);
  const [page] = await db.select({ type: pages.type }).from(pages).where(eq(pages.id, databasePageId)).limit(1);
  if (!page || page.type !== "database") throw new ValidationError("This page is not a database.");
}

export async function listProperties(userId: string, databasePageId: string) {
  await assertIsDatabase(userId, databasePageId, "view");
  return db
    .select()
    .from(databaseProperties)
    .where(eq(databaseProperties.databasePageId, databasePageId))
    .orderBy(databaseProperties.position);
}

export async function createProperty(userId: string, raw: CreatePropertyInput) {
  const input = createPropertySchema.parse(raw);
  await assertIsDatabase(userId, input.databasePageId, "edit");

  const [last] = await db
    .select({ position: databaseProperties.position })
    .from(databaseProperties)
    .where(eq(databaseProperties.databasePageId, input.databasePageId))
    .orderBy(desc(databaseProperties.position))
    .limit(1);

  const [property] = await db
    .insert(databaseProperties)
    .values({
      databasePageId: input.databasePageId,
      name: input.name,
      type: input.type,
      position: (last?.position ?? -1) + 1,
      config:
        input.type === "status"
          ? { options: defaultStatusOptions() }
          : input.type === "select" || input.type === "multi_select"
            ? { options: [] }
            : {},
    })
    .returning();
  return property;
}

export async function updateProperty(userId: string, raw: UpdatePropertyInput) {
  const input = updatePropertySchema.parse(raw);
  const [property] = await db.select().from(databaseProperties).where(eq(databaseProperties.id, input.propertyId)).limit(1);
  if (!property) throw new ValidationError("Property not found.");
  await assertIsDatabase(userId, property.databasePageId, "edit");

  await db
    .update(databaseProperties)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.config !== undefined ? { config: input.config } : {}),
    })
    .where(eq(databaseProperties.id, input.propertyId));
}

export async function deleteProperty(userId: string, raw: DeletePropertyInput) {
  const input = deletePropertySchema.parse(raw);
  const [property] = await db.select().from(databaseProperties).where(eq(databaseProperties.id, input.propertyId)).limit(1);
  if (!property) throw new ValidationError("Property not found.");
  if (property.type === "title") throw new ValidationError("The title property cannot be deleted.");
  await assertIsDatabase(userId, property.databasePageId, "edit");

  await db.delete(databaseRowValues).where(eq(databaseRowValues.propertyId, input.propertyId));
  await db.delete(databaseProperties).where(eq(databaseProperties.id, input.propertyId));
}
