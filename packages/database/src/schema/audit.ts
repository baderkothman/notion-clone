import { pgTable, text, timestamp, uuid, jsonb, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { users } from "./identity";

/** Append-only. Written for security-relevant actions (share/unshare, role changes,
 * invitations, permanent deletes, login failures) — not a general activity feed. */
export const auditEvents = pgTable(
  "audit_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    workspaceId: uuid("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    targetType: text("target_type").notNull(),
    targetId: text("target_id").notNull(),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default({}),
    ipAddress: text("ip_address"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("audit_events_workspace_created_idx").on(table.workspaceId, table.createdAt)],
);
