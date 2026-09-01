"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, MessageSquare, RotateCcw, X } from "lucide-react";
import { Avatar, Button } from "@notion-clone/ui";
import {
  listCommentsAction,
  createCommentAction,
  resolveCommentAction,
  deleteCommentAction,
} from "@/app/(app)/actions/comments";

interface Comment {
  id: string;
  blockId: string | null;
  parentCommentId: string | null;
  body: string;
  authorId: string;
  authorName: string | null;
  authorImage: string | null;
  resolvedAt: Date | null;
  createdAt: Date;
}

export function CommentsPanel({ pageId, open }: { pageId: string; open: boolean }) {
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [draft, setDraft] = React.useState("");
  const [showResolved, setShowResolved] = React.useState(false);

  const refresh = React.useCallback(async () => {
    const result = await listCommentsAction(pageId);
    if (result.ok) setComments(result.value);
  }, [pageId]);

  React.useEffect(() => {
    if (open) void refresh();
  }, [open, refresh]);

  if (!open) return null;

  const topLevel = comments.filter((c) => !c.parentCommentId && (showResolved || !c.resolvedAt));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.trim()) return;
    const result = await createCommentAction({ pageId, body: draft.trim() });
    if (!result.ok) return toast.error(result.error);
    setDraft("");
    void refresh();
  }

  async function handleResolve(commentId: string, resolved: boolean) {
    const result = await resolveCommentAction({ commentId, resolved });
    if (!result.ok) return toast.error(result.error);
    void refresh();
  }

  async function handleDelete(commentId: string) {
    const result = await deleteCommentAction({ commentId });
    if (!result.ok) return toast.error(result.error);
    void refresh();
  }

  return (
    <aside className="flex h-full w-80 shrink-0 flex-col border-l border-border">
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <h2 className="text-sm font-medium text-text">Comments</h2>
        <button onClick={() => setShowResolved((v) => !v)} className="text-xs text-text-faint hover:text-text">
          {showResolved ? "Hide resolved" : "Show resolved"}
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {topLevel.length === 0 ? (
          <p className="flex flex-col items-center gap-2 py-10 text-center text-sm text-text-faint">
            <MessageSquare className="h-6 w-6" />
            No comments yet
          </p>
        ) : (
          topLevel.map((comment) => (
            <div key={comment.id} className="rounded-md border border-border p-2.5">
              <div className="flex items-center gap-2">
                <Avatar name={comment.authorName ?? "?"} src={comment.authorImage} size={20} />
                <span className="text-xs font-medium text-text">{comment.authorName}</span>
                <span className="text-xs text-text-faint">{new Date(comment.createdAt).toLocaleDateString()}</span>
              </div>
              <p className="mt-1.5 text-sm text-text">{comment.body}</p>
              <div className="mt-1.5 flex items-center gap-2">
                <button
                  onClick={() => handleResolve(comment.id, !comment.resolvedAt)}
                  className="flex items-center gap-1 text-xs text-text-faint hover:text-text"
                >
                  {comment.resolvedAt ? <RotateCcw className="h-3 w-3" /> : <Check className="h-3 w-3" />}
                  {comment.resolvedAt ? "Reopen" : "Resolve"}
                </button>
                <button
                  onClick={() => handleDelete(comment.id)}
                  className="flex items-center gap-1 text-xs text-text-faint hover:text-destructive"
                >
                  <X className="h-3 w-3" /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2 border-t border-border p-2.5">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Add a comment…"
          className="min-w-0 flex-1 rounded-md border border-border bg-surface px-2 py-1.5 text-sm outline-none focus-visible:ring-2 focus-visible:ring-focus"
        />
        <Button type="submit" size="sm">
          Send
        </Button>
      </form>
    </aside>
  );
}
