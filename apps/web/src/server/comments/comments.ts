import "server-only";
import { db, comments, users, eq, and, isNull } from "@notion-clone/database";
import {
  createCommentSchema,
  updateCommentSchema,
  deleteCommentSchema,
  resolveCommentSchema,
  type CreateCommentInput,
  type UpdateCommentInput,
  type DeleteCommentInput,
  type ResolveCommentInput,
} from "@notion-clone/contracts";
import { ForbiddenError, NotFoundError } from "@notion-clone/shared";
import { assertPagePermission } from "../permissions/assert";

export async function listComments(userId: string, pageId: string) {
  await assertPagePermission(userId, pageId, "view");
  return db
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
}

export async function createComment(userId: string, raw: CreateCommentInput) {
  const input = createCommentSchema.parse(raw);
  await assertPagePermission(userId, input.pageId, "comment");

  const [comment] = await db
    .insert(comments)
    .values({
      pageId: input.pageId,
      blockId: input.blockId ?? null,
      parentCommentId: input.parentCommentId ?? null,
      authorId: userId,
      body: input.body,
    })
    .returning();
  return comment;
}

export async function updateComment(userId: string, raw: UpdateCommentInput) {
  const input = updateCommentSchema.parse(raw);
  const [comment] = await db.select().from(comments).where(eq(comments.id, input.commentId)).limit(1);
  if (!comment) throw new NotFoundError("Comment");
  if (comment.authorId !== userId) throw new ForbiddenError("You can only edit your own comments.");

  await db
    .update(comments)
    .set({ body: input.body, editedAt: new Date() })
    .where(eq(comments.id, input.commentId));
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
