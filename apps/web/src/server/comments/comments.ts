import "server-only";
import { db, comments, commentMentions, users, eq, and, isNull, inArray } from "@notion-clone/database";
import {
  createCommentSchema,
  deleteCommentSchema,
  resolveCommentSchema,
  type CreateCommentInput,
  type DeleteCommentInput,
  type ResolveCommentInput,
} from "@notion-clone/contracts";
import { NotFoundError } from "@notion-clone/shared";
import { assertPagePermission } from "../permissions/assert";

export async function listComments(userId: string, pageId: string) {
  await assertPagePermission(userId, pageId, "view");
  const rows = await db
    .select({
      id: comments.id,
      blockId: comments.blockId,
      parentCommentId: comments.parentCommentId,
      body: comments.body,
      authorId: comments.authorId,
      authorName: users.name,
      authorImage: users.image,
      resolvedAt: comments.resolvedAt,
      editedAt: comments.editedAt,
      createdAt: comments.createdAt,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(and(eq(comments.pageId, pageId), isNull(comments.deletedAt)));

  const commentIds = rows.map((r) => r.id);
  const mentions = commentIds.length
    ? await db
        .select({ commentId: commentMentions.commentId, userId: commentMentions.mentionedUserId })
        .from(commentMentions)
        .where(inArray(commentMentions.commentId, commentIds))
    : [];
  const mentionsByComment = new Map<string, string[]>();
  for (const m of mentions) {
    const list = mentionsByComment.get(m.commentId) ?? [];
    list.push(m.userId);
    mentionsByComment.set(m.commentId, list);
  }

  return rows.map((row) => ({ ...row, mentionedUserIds: mentionsByComment.get(row.id) ?? [] }));
}

export async function createComment(userId: string, raw: CreateCommentInput) {
  const input = createCommentSchema.parse(raw);
  await assertPagePermission(userId, input.pageId, "comment");

  return db.transaction(async (tx) => {
    const [comment] = await tx
      .insert(comments)
      .values({
        pageId: input.pageId,
        blockId: input.blockId ?? null,
        parentCommentId: input.parentCommentId ?? null,
        authorId: userId,
        body: input.body,
      })
      .returning();
    if (!comment) throw new Error("Failed to create comment.");

    const mentionedUserIds = [...new Set(input.mentionedUserIds ?? [])];
    if (mentionedUserIds.length > 0) {
      await tx
        .insert(commentMentions)
        .values(mentionedUserIds.map((mentionedUserId) => ({ commentId: comment.id, mentionedUserId })));
    }

    return comment;
  });
}

export async function deleteComment(userId: string, raw: DeleteCommentInput) {
  const input = deleteCommentSchema.parse(raw);
  const [comment] = await db.select().from(comments).where(eq(comments.id, input.commentId)).limit(1);
  if (!comment) throw new NotFoundError("Comment");

  if (comment.authorId !== userId) {
    // Non-authors may delete only if they have "full" access to the page (moderation).
    await assertPagePermission(userId, comment.pageId, "full");
  }

  await db.update(comments).set({ deletedAt: new Date() }).where(eq(comments.id, input.commentId));
}

export async function resolveComment(userId: string, raw: ResolveCommentInput) {
  const input = resolveCommentSchema.parse(raw);
  const [comment] = await db.select().from(comments).where(eq(comments.id, input.commentId)).limit(1);
  if (!comment) throw new NotFoundError("Comment");
  await assertPagePermission(userId, comment.pageId, "comment");

  await db
    .update(comments)
    .set(
      input.resolved
        ? { resolvedAt: new Date(), resolvedByUserId: userId }
        : { resolvedAt: null, resolvedByUserId: null },
    )
    .where(eq(comments.id, input.commentId));
}
