import { pgTable, text, timestamp, uuid, bigint, pgEnum, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { pages } from "./pages";
import { users } from "./identity";

export const fileStatusEnum = pgEnum("file_status", ["pending", "uploaded", "deleted"]);

/**
 * `objectKey` is a randomized storage key (never derived from the filename — see
 * docs/SECURITY.md), scoped under the workspace id so a leaked key from one workspace's
 * prefix is still meaningless without matching authorization. Rows start "pending" when
 * a client requests a presigned upload URL and flip to "uploaded" only after the server
 * confirms the object exists (HEAD request) — an unconfirmed pending row is never
 * rendered or linked. Deleting a file soft-deletes the row and schedules object removal.
 */
export const files = pgTable(
  "files",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    pageId: uuid("page_id").references(() => pages.id, { onDelete: "cascade" }),
    uploadedByUserId: uuid("uploaded_by_user_id")
      .notNull()
      .references(() => users.id, { onDelete: "restrict" }),
    objectKey: text("object_key").notNull().unique(),
    originalFilename: text("original_filename").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: bigint("size_bytes", { mode: "number" }).notNull(),
    status: fileStatusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => [
    index("files_workspace_idx").on(table.workspaceId),
    index("files_page_idx").on(table.pageId),
  ],
);
