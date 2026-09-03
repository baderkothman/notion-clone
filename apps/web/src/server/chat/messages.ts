import "server-only";
import { db, chatChannels, chatMessages, chatMessageMentions, users, eq, and, gt, isNull, asc, inArray } from "@notion-clone/database";
import {
  sendMessageSchema,
  editMessageSchema,
  deleteMessageSchema,
  listMessagesSchema,
  type SendMessageInput,
  type EditMessageInput,
  type DeleteMessageInput,
} from "@notion-clone/contracts";
import { NotFoundError, ForbiddenError, ValidationError } from "@notion-clone/shared";
import { assertWorkspaceCapability } from "../permissions/assert";
import { getWorkspaceRole } from "../permissions/workspace-role";
import { ROLE_CAPABILITIES } from "@notion-clone/contracts";

async function getChannelOrThrow(channelId: string) {
  const [channel] = await db.select().from(chatChannels).where(eq(chatChannels.id, channelId)).limit(1);
  if (!channel || channel.archivedAt) throw new NotFoundError("Channel");
  return channel;
}

// Includes joined author columns and the resolved mention list — not just the raw
// table shape — so this is derived from `listMessages`'s actual return type rather
// than duplicated by hand (see `ChatMessage` at the bottom of this file).
export async function listMessages(userId: string, raw: unknown) {
  // Not annotated as `ListMessagesInput` — that's the *input* type (`limit` optional,
  // see contracts/chat.ts), while `.parse()`'s actual return value is the *output*
  // type, with `limit` guaranteed present via its `.default(50)`. Letting this infer
  // keeps that guarantee instead of silently widening it back to `number | undefined`.
  const input = listMessagesSchema.parse(raw);
  const channel = await getChannelOrThrow(input.channelId);
  await assertWorkspaceCapability(userId, channel.workspaceId, "useChat");

  const rows = await db
    .select({
      id: chatMessages.id,
      channelId: chatMessages.channelId,
      authorId: chatMessages.authorId,
      authorName: users.name,
      authorEmail: users.email,
      authorImage: users.image,
      body: chatMessages.body,
      editedAt: chatMessages.editedAt,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .innerJoin(users, eq(users.id, chatMessages.authorId))
    .where(
      and(
        eq(chatMessages.channelId, input.channelId),
        isNull(chatMessages.deletedAt),
        // `afterMessageId` pages by matching the boundary message's own createdAt, not
        // a client-supplied timestamp — a clock-skewed browser can't cause messages to
        // be silently skipped or re-delivered.
        input.afterMessageId ? gt(chatMessages.createdAt, await createdAtOf(input.afterMessageId)) : undefined,
      ),
    )
    .orderBy(asc(chatMessages.createdAt))
    .limit(input.limit);

  const messageIds = rows.map((r) => r.id);
  const mentions = messageIds.length
    ? await db
        .select({ messageId: chatMessageMentions.messageId, userId: chatMessageMentions.mentionedUserId })
        .from(chatMessageMentions)
        .where(inArray(chatMessageMentions.messageId, messageIds))
    : [];
  const mentionsByMessage = new Map<string, string[]>();
  for (const m of mentions) {
    const list = mentionsByMessage.get(m.messageId) ?? [];
    list.push(m.userId);
    mentionsByMessage.set(m.messageId, list);
  }

  return rows.map((row) => ({ ...row, mentionedUserIds: mentionsByMessage.get(row.id) ?? [] }));
}

async function createdAtOf(messageId: string): Promise<Date> {
  const [row] = await db.select({ createdAt: chatMessages.createdAt }).from(chatMessages).where(eq(chatMessages.id, messageId)).limit(1);
  // A boundary message that's since been deleted/vanished shouldn't make polling
  // throw — falling back to "the epoch" just means this poll returns everything,
  // equivalent to a fresh load, which is the safe direction to fail in.
  return row?.createdAt ?? new Date(0);
}

export async function sendMessage(userId: string, raw: SendMessageInput) {
  const input = sendMessageSchema.parse(raw);
  const channel = await getChannelOrThrow(input.channelId);
  await assertWorkspaceCapability(userId, channel.workspaceId, "useChat");

  // Returns the same shape `listMessages` does (joined author fields +
  // `mentionedUserIds`), not the bare inserted row — the caller appends this straight
  // into a list of that shape (see chat-shell.tsx's `handleSend`), and a bare row
  // would render with a missing name/avatar until the next poll caught up.
  return db.transaction(async (tx) => {
    const [message] = await tx
      .insert(chatMessages)
      .values({ channelId: input.channelId, authorId: userId, body: input.body })
      .returning();
    if (!message) throw new ValidationError("Could not send this message.");

    const mentionedUserIds = [...new Set(input.mentionedUserIds)];
    if (mentionedUserIds.length > 0) {
      await tx
        .insert(chatMessageMentions)
        .values(mentionedUserIds.map((mentionedUserId) => ({ messageId: message.id, mentionedUserId })));
    }

    const [author] = await tx.select({ name: users.name, email: users.email, image: users.image }).from(users).where(eq(users.id, userId)).limit(1);

    return {
      id: message.id,
      channelId: message.channelId,
      authorId: message.authorId,
      authorName: author?.name ?? null,
      authorEmail: author?.email ?? "",
      authorImage: author?.image ?? null,
      body: message.body,
      editedAt: message.editedAt,
      createdAt: message.createdAt,
      mentionedUserIds,
    };
  });
}

export async function editMessage(userId: string, raw: EditMessageInput) {
  const input = editMessageSchema.parse(raw);
  const [message] = await db.select().from(chatMessages).where(eq(chatMessages.id, input.messageId)).limit(1);
  if (!message || message.deletedAt) throw new NotFoundError("Message");
  if (message.authorId !== userId) throw new ForbiddenError("You can only edit your own messages.");

  const [updated] = await db
    .update(chatMessages)
    .set({ body: input.body, editedAt: new Date() })
    .where(eq(chatMessages.id, input.messageId))
    .returning();
  // Guards against a theoretical concurrent-delete race between the check above and
  // this write (rather than silently returning `undefined` — the caller appends this
  // straight into a rendered list, so a value it can trust to be present matters here).
  if (!updated) throw new NotFoundError("Message");
  return updated;
}

export async function deleteMessage(userId: string, raw: DeleteMessageInput) {
  const input = deleteMessageSchema.parse(raw);
  const [message] = await db.select().from(chatMessages).where(eq(chatMessages.id, input.messageId)).limit(1);
  if (!message || message.deletedAt) throw new NotFoundError("Message");

  if (message.authorId !== userId) {
    // Non-authors may delete only with manageWorkspace (moderation) — same shape as
    // comments' "author, or full page access" rule, adapted to a workspace-wide
    // surface with no per-message permission grant to check instead.
    const channel = await getChannelOrThrow(message.channelId);
    const role = await getWorkspaceRole(userId, channel.workspaceId);
    if (!role || !ROLE_CAPABILITIES[role].manageWorkspace) {
      throw new ForbiddenError("You can only delete your own messages.");
    }
  }

  await db.update(chatMessages).set({ deletedAt: new Date() }).where(eq(chatMessages.id, input.messageId));
}

export type ChatMessage = Awaited<ReturnType<typeof listMessages>>[number];
