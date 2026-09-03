import { pgTable, text, timestamp, uuid, boolean, index, unique } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./identity";

/**
 * Workspace-wide team chat — a genuinely new module (comments.ts is unrelated: those
 * attach to one page/block, these are a standing, workspace-level channel). See
 * docs/ARCHITECTURE.md "Chat" for the delivery model (polling, not push — a deliberate
 * scope decision, same reasoning as the Google Calendar sync section's webhook cut).
 */

export const chatChannels = pgTable(
  "chat_channels",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    createdByUserId: uuid("created_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Every workspace gets exactly one — lazily created the first time anyone opens
     * Chat (see server/chat/queries.ts's `ensureDefaultChannel`), not at workspace
     * creation time, so workspaces that never use chat never carry the row. */
    isDefault: boolean("is_default").notNull().default(false),
    archivedAt: timestamp("archived_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("chat_channels_workspace_idx").on(table.workspaceId),
    unique("chat_channels_workspace_name_unique").on(table.workspaceId, table.name),
  ],
);

export const chatMessages = pgTable(
  "chat_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    channelId: uuid("channel_id")
      .notNull()
      .references(() => chatChannels.id, { onDelete: "cascade" }),
    authorId: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    body: text("body").notNull(),
    editedAt: timestamp("edited_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("chat_messages_channel_created_idx").on(table.channelId, table.createdAt)],
);

/** Same pattern as comment_mentions (schema/comments.ts): extracted at write time from
 * the composer's tracked mention list, not re-parsed from "@Name" text later. */
export const chatMessageMentions = pgTable(
  "chat_message_mentions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    messageId: uuid("message_id")
      .notNull()
      .references(() => chatMessages.id, { onDelete: "cascade" }),
    mentionedUserId: uuid("mentioned_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("chat_message_mentions_user_idx").on(table.mentionedUserId)],
);
