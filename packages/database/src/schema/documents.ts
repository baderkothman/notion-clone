import { pgTable, timestamp, uuid, jsonb, integer } from "drizzle-orm/pg-core";
import { pages } from "./pages";
import { users } from "./identity";
import type { JSONContent } from "@notion-clone/contracts";

/**
 * A page's block content, kept in its own table (not on `pages`) so the hot autosave
 * path never touches page-tree metadata rows, and so page-tree queries (sidebar,
 * breadcrumbs) never pull large JSON blobs.
 *
 * `content` is a Tiptap/ProseMirror JSON document. `version` is an optimistic-concurrency
 * counter: every write includes the version it read, and the update is a conditional
 * `WHERE version = $expected` — see apps/web/src/server/blocks/save-document.ts. This is
 * the last-write-wins guard for autosave; live co-editing instead goes through the Yjs
 * CRDT in apps/realtime, which sidesteps the conflict question entirely by merging.
 */
export const documents = pgTable("documents", {
  pageId: uuid("page_id")
    .primaryKey()
    .references(() => pages.id, { onDelete: "cascade" }),
  content: jsonb("content").$type<JSONContent>().notNull(),
  version: integer("version").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedByUserId: uuid("updated_by_user_id").references(() => users.id, {
    onDelete: "set null",
  }),
});
