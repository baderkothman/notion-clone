"use server";

import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import {
  listComments,
  createComment,
  deleteComment,
  resolveComment,
} from "@/server/comments/comments";
import type {
  CreateCommentInput,
  DeleteCommentInput,
  ResolveCommentInput,
} from "@notion-clone/contracts";

export async function listCommentsAction(pageId: string) {
  const userId = await requireUserId();
  return runAction(() => listComments(userId, pageId));
}

export async function createCommentAction(input: CreateCommentInput) {
  const userId = await requireUserId();
  return runAction(() => createComment(userId, input));
}

export async function deleteCommentAction(input: DeleteCommentInput) {
  const userId = await requireUserId();
  return runAction(() => deleteComment(userId, input));
}

export async function resolveCommentAction(input: ResolveCommentInput) {
  const userId = await requireUserId();
  return runAction(() => resolveComment(userId, input));
}
