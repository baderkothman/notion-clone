import { pgTable, text, timestamp, uuid, customType } from "drizzle-orm/pg-core";
import { pages } from "./pages";
import { workspaces } from "./workspaces";

const tsvector = customType<{ data: string }>({
  dataType() {
    return "tsvector";
  },
});

/**
 * Denormalized search index, one row per page, kept in sync by the pages/blocks write
 * paths (see apps/web/src/server/search/index-page.ts) rather than a DB trigger, so the
 * plain-text extraction from Tiptap JSON lives in one place in application code. This
 * table is the `SearchProvider` implementation for phase 1 (packages/contracts defines
 * the interface); swapping in a dedicated search engine later means writing a new
 * provider against the same interface, not touching callers.
 *
 * `tsv` is populated by `to_tsvector('english', title || ' ' || body)` on write.
 * A GIN index over `tsv` is created in the migration (drizzle-kit doesn't yet generate
 * GIN index DDL for computed tsvector columns cleanly, so it's added as raw SQL).
 */
export const searchDocuments = pgTable("search_documents", {
  pageId: uuid("page_id")
    .primaryKey()
    .references(() => pages.id, { onDelete: "cascade" }),
  workspaceId: uuid("workspace_id")
    .notNull()
    .references(() => workspaces.id, { onDelete: "cascade" }),
  title: text("title").notNull().default(""),
  body: text("body").notNull().default(""),
  tsv: tsvector("tsv"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});
