import { z } from "zod";

/** Team chat contracts — see packages/database/src/schema/chat.ts for the storage
 * shape and docs/ARCHITECTURE.md's "Chat" section for the delivery model. */

export const createChannelSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z
    .string()
    .trim()
    .min(1, "Give this channel a name.")
    .max(80)
    .regex(/^[a-z0-9][a-z0-9-]*$/i, "Use letters, numbers, and hyphens only."),
});
export type CreateChannelInput = z.infer<typeof createChannelSchema>;

export const sendMessageSchema = z.object({
  channelId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
  mentionedUserIds: z.array(z.string().uuid()).max(50).default([]),
});
// `z.input`, not `z.infer` (= `z.output`) — `mentionedUserIds` has a `.default([])`,
// so the *output* type (what `.parse()` returns) makes it required, but the *input*
// type (what a caller actually constructs) correctly leaves it optional. Using
// `z.infer` here would force every call site to pass `mentionedUserIds: []` even when
// there are none, for no real benefit — see calendar.ts's doc comment on `z.date()`
// for the same input/output mismatch caught the same way earlier this session.
export type SendMessageInput = z.input<typeof sendMessageSchema>;

export const editMessageSchema = z.object({
  messageId: z.string().uuid(),
  body: z.string().trim().min(1).max(4000),
});
export type EditMessageInput = z.infer<typeof editMessageSchema>;

export const deleteMessageSchema = z.object({ messageId: z.string().uuid() });
export type DeleteMessageInput = z.infer<typeof deleteMessageSchema>;

/** `afterMessageId` (a message id, not a timestamp — stable under identical-
 * millisecond inserts, which a busy channel will eventually produce) is how the chat
 * view polls for new messages without re-fetching everything it already has; omit it
 * for the initial load (the most recent `limit` messages). Scroll-back pagination
 * further into history isn't implemented in this pass — see docs/ARCHITECTURE.md. */
export const listMessagesSchema = z.object({
  channelId: z.string().uuid(),
  afterMessageId: z.string().uuid().nullable().optional(),
  limit: z.number().int().min(1).max(100).default(50),
});
// `z.input`, not `z.infer` — see `SendMessageInput`'s doc comment above; `limit` has a
// default, and callers should be able to omit it.
export type ListMessagesInput = z.input<typeof listMessagesSchema>;
