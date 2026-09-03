import { z } from "zod";

export const propertyTypes = [
  "title",
  "text",
  "number",
  "select",
  "multi_select",
  "status",
  "date",
  "checkbox",
  "url",
  "person",
  "files",
] as const;
export const propertyTypeSchema = z.enum(propertyTypes);
export type PropertyType = z.infer<typeof propertyTypeSchema>;

/** The three groups every real workflow status belongs to — Notion and ClickUp both
 * converge on this exact set (however many stages a team defines in between, each one
 * is still either "not started yet," "actively being worked," or "finished"). Board
 * columns and the status picker both use this to group/order/color options beyond
 * what a generic `select` gives you — see `defaultStatusOptions` below. */
export const statusCategories = ["todo", "in_progress", "complete"] as const;
export const statusCategorySchema = z.enum(statusCategories);
export type StatusCategory = z.infer<typeof statusCategorySchema>;

export const STATUS_CATEGORY_META: Record<StatusCategory, { label: string; color: string }> = {
  todo: { label: "To do", color: "gray" },
  in_progress: { label: "In progress", color: "blue" },
  complete: { label: "Complete", color: "green" },
};

export const selectOptionSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  color: z.string().max(20),
  /** Only meaningful for a `status`-type property's options — `select`/`multi_select`
   * options leave this unset. Optional (not a separate schema) because every property
   * type that offers "pick from a set of colored options" already shares one editor
   * component (select-editor.tsx) and one cell renderer; a second near-identical type
   * would just be the same shape with an extra required field. */
  category: statusCategorySchema.optional(),
});
export type SelectOption = z.infer<typeof selectOptionSchema>;

/** Seeded onto every new `status` property (see server/databases/properties.ts) — one
 * stage per category, in category order, so a freshly created Status property is
 * immediately a usable 3-column board without the user configuring anything first.
 * IDs are assigned at creation time (`newId()`), not fixed here, so two properties'
 * options never collide. */
export const DEFAULT_STATUS_OPTION_NAMES: { name: string; category: StatusCategory }[] = [
  { name: "Not started", category: "todo" },
  { name: "In progress", category: "in_progress" },
  { name: "Done", category: "complete" },
];

export const createPropertySchema = z.object({
  databasePageId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  type: propertyTypeSchema,
});
export type CreatePropertyInput = z.infer<typeof createPropertySchema>;

export const updatePropertySchema = z.object({
  propertyId: z.string().uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  config: z.record(z.unknown()).optional(),
});
export type UpdatePropertyInput = z.infer<typeof updatePropertySchema>;

export const deletePropertySchema = z.object({ propertyId: z.string().uuid() });
export type DeletePropertyInput = z.infer<typeof deletePropertySchema>;

export const setRowValueSchema = z.object({
  rowPageId: z.string().uuid(),
  propertyId: z.string().uuid(),
  value: z.unknown(),
});
export type SetRowValueInput = z.infer<typeof setRowValueSchema>;

export const viewTypes = ["table", "board", "list", "calendar"] as const;
export const viewTypeSchema = z.enum(viewTypes);
export type ViewType = z.infer<typeof viewTypeSchema>;

export const filterConditionSchema = z.object({
  propertyId: z.string().uuid(),
  operator: z.enum([
    "equals",
    "not_equals",
    "contains",
    "not_contains",
    "is_empty",
    "is_not_empty",
    "greater_than",
    "less_than",
  ]),
  value: z.unknown().optional(),
});

export type FilterCondition = z.infer<typeof filterConditionSchema>;

export const sortConditionSchema = z.object({
  propertyId: z.string().uuid(),
  direction: z.enum(["asc", "desc"]),
});
export type SortCondition = z.infer<typeof sortConditionSchema>;

export const viewConfigSchema = z.object({
  filters: z.array(filterConditionSchema).default([]),
  sorts: z.array(sortConditionSchema).default([]),
  groupByPropertyId: z.string().uuid().nullable().optional(),
  visiblePropertyIds: z.array(z.string().uuid()).optional(),
  datePropertyId: z.string().uuid().nullable().optional(),
});
export type ViewConfig = z.infer<typeof viewConfigSchema>;

export const createViewSchema = z.object({
  databasePageId: z.string().uuid(),
  name: z.string().trim().min(1).max(100),
  type: viewTypeSchema,
});
export type CreateViewInput = z.infer<typeof createViewSchema>;

export const updateViewSchema = z.object({
  viewId: z.string().uuid(),
  name: z.string().trim().min(1).max(100).optional(),
  config: viewConfigSchema.partial().optional(),
});
export type UpdateViewInput = z.infer<typeof updateViewSchema>;
