import "server-only";
import { db, chatChannels, eq, and, isNull, asc } from "@notion-clone/database";
import { createChannelSchema, type CreateChannelInput } from "@notion-clone/contracts";
import { ValidationError } from "@notion-clone/shared";
import { assertWorkspaceCapability } from "../permissions/assert";

export type ChatChannel = typeof chatChannels.$inferSelect;

export async function listChannels(userId: string, workspaceId: string) {
  await assertWorkspaceCapability(userId, workspaceId, "useChat");
  return db
    .select()
    .from(chatChannels)
    .where(and(eq(chatChannels.workspaceId, workspaceId), isNull(chatChannels.archivedAt)))
    .orderBy(asc(chatChannels.createdAt));
}

/** Chat has no setup step — the first time anyone in a workspace opens it, a "general"
 * channel is created on the fly rather than asking the user to create one first (the
 * same "immediately usable, not an empty shell" reasoning as Status's seeded options
 * and the task-list quick-start). Concurrency-safe: a unique constraint on
 * `(workspace_id, name)` means a second simultaneous call just hits that constraint
 * and falls through to re-reading the row the other call created, rather than a race
 * producing two "general" channels. */
export async function ensureDefaultChannel(userId: string, workspaceId: string) {
  await assertWorkspaceCapability(userId, workspaceId, "useChat");

  const [existing] = await db
    .select()
    .from(chatChannels)
    .where(and(eq(chatChannels.workspaceId, workspaceId), eq(chatChannels.isDefault, true)))
    .limit(1);
  if (existing) return existing;

  const [created] = await db
    .insert(chatChannels)
    .values({ workspaceId, name: "general", createdByUserId: userId, isDefault: true })
    .onConflictDoNothing({ target: [chatChannels.workspaceId, chatChannels.name] })
    .returning();
  if (created) return created;

  // Lost the race — another request created it between our SELECT and INSERT.
  const [row] = await db
    .select()
    .from(chatChannels)
    .where(and(eq(chatChannels.workspaceId, workspaceId), eq(chatChannels.name, "general")))
    .limit(1);
  if (!row) throw new ValidationError("Could not set up the default channel.");
  return row;
}

export async function createChannel(userId: string, raw: CreateChannelInput) {
  const input = createChannelSchema.parse(raw);
  await assertWorkspaceCapability(userId, input.workspaceId, "useChat");

  const normalizedName = input.name.toLowerCase();
  const [existing] = await db
    .select({ id: chatChannels.id })
    .from(chatChannels)
    .where(and(eq(chatChannels.workspaceId, input.workspaceId), eq(chatChannels.name, normalizedName)))
    .limit(1);
  if (existing) throw new ValidationError("A channel with that name already exists.");

  const [channel] = await db
    .insert(chatChannels)
    .values({ workspaceId: input.workspaceId, name: normalizedName, createdByUserId: userId })
    .returning();
  if (!channel) throw new ValidationError("Could not create this channel.");
  return channel;
}
