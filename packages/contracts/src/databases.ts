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

export const selectOptionSchema = z.object({
  id: z.string(),
  name: z.string().max(100),
  color: z.string().max(20),
});
export type SelectOption = z.infer<typeof selectOptionSchema>;

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

export const sortConditionSchema = z.object({
  propertyId: z.string().uuid(),
  direction: z.enum(["asc", "desc"]),
});

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
