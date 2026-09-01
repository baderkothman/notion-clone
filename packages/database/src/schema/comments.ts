import { pgTable, text, timestamp, uuid, index } from "drizzle-orm/pg-core";
import { pages } from "./pages";
import { users } from "./identity";
import type { AnyPgColumn } from "drizzle-orm/pg-core";

/**
 * Comments attach to a page, optionally scoped to a specific block (`blockId`, the
 * Tiptap node's stable id attribute) for contextual/inline comments. `parentCommentId`
 * makes replies a thread. Resolving is tracked with who/when rather than a boolean so
 * the UI can show "resolved by X" — reopening just clears both columns.
 */
export const comments = pgTable(
  "comments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    pageId: uuid("page_id")
      .notNull()
      .references(() => pages.id, { onDelete: "cascade" }),
    blockId: text("block_id"),
    parentCommentId: uuid("parent_comment_id").references(
      (): AnyPgColumn => comments.id,
      { onDelete: "cascade" },
    ),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("comments_page_idx").on(table.pageId, table.createdAt),
    index("comments_parent_idx").on(table.parentCommentId),
  ],
);

/** Mentions are extracted from comment/document rich text at write time so notification
 * fan-out (phase 2) never has to re-parse content — see docs/ARCHITECTURE.md. */
export const commentMentions = pgTable(
  "comment_mentions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    commentId: uuid("comment_id")
      .notNull()
      .references(() => comments.id, { onDelete: "cascade" }),
    mentionedUserId: uuid("mentioned_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("comment_mentions_user_idx").on(table.mentionedUserId)],
);
