import { pgTable, text, timestamp, uuid, pgEnum, boolean, index, unique } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./identity";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

export const pageTypeEnum = pgEnum("page_type", ["page", "database"]);
export const pageVisibilityEnum = pgEnum("page_visibility", ["private", "workspace"]);
export const shareRoleEnum = pgEnum("share_role", ["view", "comment", "edit", "full"]);

/**
 * A page is the single unit of content in the tree: an ordinary page, a child page, or
 * a "database" (whose children are row-pages — see schema/databases.ts). Ordering among
 * siblings uses a fractional sort key (lexicographically sortable string) so reordering
 * one page never requires rewriting its siblings — see packages/shared's fractional
 * index helper, used by apps/web/src/server/pages/reorder.ts.
 */
export const pages = pgTable(
  "pages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    parentId: uuid("parent_id").references((): AnyPgColumn => pages.id, { onDelete: "cascade" }),
    type: pageTypeEnum("type").notNull().default("page"),
    title: text("title").notNull().default(""),
    icon: text("icon"),
    coverImage: text("cover_image"),
    sortKey: text("sort_key").notNull(),
    /** "private" = visible only to the owner and explicit shares (schema/permissions.ts).
     * "workspace" = every workspace member can at least view it, subject to their role. */
    visibility: pageVisibilityEnum("visibility").notNull().default("private"),
    /** Role granted to workspace members (not guests) when visibility = "workspace". */
    workspaceShareRole: shareRoleEnum("workspace_share_role").notNull().default("edit"),
    publicShareEnabled: boolean("public_share_enabled").notNull().default(false),
    publicShareRole: shareRoleEnum("public_share_role").notNull().default("view"),
    publicShareToken: text("public_share_token").unique(),
    isArchived: boolean("is_archived").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    archivedByUserId: uuid("archived_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    lastEditedByUserId: uuid("last_edited_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("pages_workspace_parent_idx").on(table.workspaceId, table.parentId),
    index("pages_workspace_archived_idx").on(table.workspaceId, table.isArchived),
  ],
);

export const favorites = pgTable(
  "favorites",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("favorites_user_idx").on(table.userId),
    unique("favorites_user_page_unique").on(table.userId, table.pageId),
  ],
);
