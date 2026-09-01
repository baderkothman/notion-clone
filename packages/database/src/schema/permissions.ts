import { pgTable, timestamp, uuid, index, unique } from "drizzle-orm/pg-core";
import { pages, shareRoleEnum } from "./pages";
import { users } from "./identity";

/**
 * Explicit per-user shares (including guests who have no workspace membership beyond
 * this). A page's *effective* permission for a user is resolved by:
 *   1. an explicit row here for this exact page, else
 *   2. an explicit row here on the nearest shared ancestor page (inherited), else
 *   3. the page's `visibility` ("workspace" grants the requester's workspace role-derived
 *      access; "private" grants nothing), else
 *   4. deny.
 * See apps/web/src/server/permissions/resolve.ts — the single place this walk happens.
 * Every API route calls into that module; nothing re-implements this logic inline.
 */
export const pageShares = pgTable(
  "page_shares",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: shareRoleEnum("role").notNull().default("view"),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("page_shares_page_user_unique").on(table.pageId, table.userId),
    index("page_shares_user_idx").on(table.userId),
  ],
);
