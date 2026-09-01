import { z } from "zod";

export const createCommentSchema = z.object({
  pageId: z.string().uuid(),
  blockId: z.string().max(200).nullable().optional(),
  parentCommentId: z.string().uuid().nullable().optional(),
  body: z.string().trim().min(1).max(10_000),
  /** User ids explicitly chosen via the composer's @mention autocomplete — not parsed
   * from the body text, which would be fragile against display-name collisions/edits.
   * See packages/database/src/schema/comments.ts's `comment_mentions` table. */
  mentionedUserIds: z.array(z.string().uuid()).max(50).optional(),
});
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({
  commentId: z.string().uuid(),
  body: z.string().trim().min(1).max(10_000),
});
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export const deleteCommentSchema = z.object({ commentId: z.string().uuid() });
export type DeleteCommentInput = z.infer<typeof deleteCommentSchema>;

export const resolveCommentSchema = z.object({
  commentId: z.string().uuid(),
  resolved: z.boolean(),
});
export type ResolveCommentInput = z.infer<typeof resolveCommentSchema>;
