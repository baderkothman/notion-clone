import { pgTable, text, timestamp, uuid, jsonb, integer, pgEnum, index, unique } from "drizzle-orm/pg-core";
import { pages } from "./pages";

export const propertyTypeEnum = pgEnum("property_type", [
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
]);

export const databaseViewTypeEnum = pgEnum("database_view_type", [
  "table",
  "board",
  "list",
  "calendar",
]);

/**
 * A "database" is a page (pages.type = 'database'); its properties are defined here and
 * its rows are ordinary child pages (pages.parentId = this database page's id). This
 * keeps rows first-class pages — they get titles, icons, comments, sharing, and the
 * block editor for free, exactly like Notion's model, instead of a bespoke row entity.
 * `config` holds type-specific config (select options + colors, number format, etc.) so
 * new property types can be added without a migration for every variant.
 */
export const databaseProperties = pgTable(
  "database_properties",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    databasePageId: uuid("database_page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: propertyTypeEnum("type").notNull(),
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("database_properties_database_idx").on(table.databasePageId)],
);

/** One row's value for one property, on a row-page. Keyed by (rowPageId, propertyId) so
 * a row simply has no entry for a property it hasn't set yet (sparse, not NULL-padded). */
export const databaseRowValues = pgTable(
  "database_row_values",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    rowPageId: uuid("row_page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    propertyId: uuid("property_id")
      .notNull()
      .references(() => databaseProperties.id, { onDelete: "cascade" }),
    value: jsonb("value").$type<unknown>(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("database_row_values_row_property_unique").on(table.rowPageId, table.propertyId),
    index("database_row_values_property_idx").on(table.propertyId),
  ],
);

export const databaseViews = pgTable(
  "database_views",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    databasePageId: uuid("database_page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: databaseViewTypeEnum("type").notNull(),
    /** filters, sorts, groupBy, visibleProperties, board groupByPropertyId, calendar
     * datePropertyId — see packages/contracts for the discriminated-union shape. */
    config: jsonb("config").$type<Record<string, unknown>>().notNull().default({}),
    position: integer("position").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("database_views_database_idx").on(table.databasePageId)],
);
