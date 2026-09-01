import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { pages } from "./pages";
import { users } from "./identity";
import type { JSONContent } from "@notion-clone/contracts";

/**
 * Point-in-time snapshots of a page's document, written on a debounce (not every
 * keystroke) — see apps/web/src/server/history/snapshot-policy.ts for the coalescing
 * rule that keeps this table from growing unboundedly (time-bucketed: last 24h dense,
 * older thinned to hourly/daily). Restoring copies a snapshot's content back into
 * `documents` as a new version and itself creates a pre-restore snapshot.
 */
export const pageRevisions = pgTable(
  "page_revisions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    content: jsonb("content").$type<JSONContent>().notNull(),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("page_revisions_page_created_idx").on(table.pageId, table.createdAt)],
);
