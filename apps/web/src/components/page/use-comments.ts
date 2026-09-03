"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  listCommentsAction,
  createCommentAction,
  resolveCommentAction,
  deleteCommentAction,
} from "@/app/(app)/actions/comments";
import { listWorkspaceMembersAction } from "@/app/(app)/actions/workspaces";
import type { Comment } from "./comments-panel";
import type { MemberOption } from "./mention-composer";

/** Owns everything about a page's comments: the panel's open/target state, the
 * comment/member lists, and the create/resolve/delete mutations — extracted out of
 * `page-view.tsx` (which was accumulating unrelated pieces of state) since this is a
 * fully self-contained concern with no dependency on the editor/collaboration/autosave
 * logic that lives alongside it there. Comments (and who's commentable, for @mentions)
 * are fetched once on mount — not only when the panel opens — because the editor's
 * right-margin comment badges need to know which blocks have threads even while the
 * panel is closed. */
export function useComments(pageId: string, workspaceId: string) {
  const [open, setOpen] = React.useState(false);
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [members, setMembers] = React.useState<MemberOption[]>([]);
  const [targetBlockId, setTargetBlockId] = React.useState<string | null>(null);

  const refresh = React.useCallback(async () => {
    const result = await listCommentsAction(pageId);
    if (result.ok) setComments(result.value);
  }, [pageId]);

  React.useEffect(() => {
    void refresh();
    void listWorkspaceMembersAction(workspaceId).then((result) => {
      if (result.ok) setMembers(result.value.map((m) => ({ userId: m.userId, name: m.name, email: m.email, image: m.image })));
    });
  }, [refresh, workspaceId]);

  const commentedBlockIds = React.useMemo(
    () => new Set(comments.filter((c) => c.blockId && !c.resolvedAt).map((c) => c.blockId!)),
    [comments],
  );

  function openForBlock(blockId: string) {
    setOpen(true);
    setTargetBlockId(blockId);
  }

  async function create(body: string, mentionedUserIds: string[], blockId: string | null, parentCommentId: string | null) {
    const result = await createCommentAction({ pageId, body, mentionedUserIds, blockId, parentCommentId });
    if (!result.ok) return toast.error(result.error);
    setTargetBlockId(null);
    void refresh();
  }

  async function resolve(commentId: string, resolved: boolean) {
    const result = await resolveCommentAction({ commentId, resolved });
    if (!result.ok) return toast.error(result.error);
    void refresh();
  }

  async function remove(commentId: string) {
    const result = await deleteCommentAction({ commentId });
    if (!result.ok) return toast.error(result.error);
    void refresh();
  }

  return {
    open,
    setOpen,
    comments,
    members,
    targetBlockId,
    commentedBlockIds,
    openForBlock,
    clearTarget: () => setTargetBlockId(null),
    create,
    resolve,
    remove,
  };
}
