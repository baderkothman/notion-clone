"use client";

import * as React from "react";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { Check, MessageSquare, RotateCcw, X } from "lucide-react";
import { Avatar, cn } from "@notion-clone/ui";
import { MentionComposer, type MemberOption } from "./mention-composer";

export interface Comment {
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

function CommentRow({
  comment,
  isReply,
  onResolve,
  onDelete,
  onReply,
}: {
  comment: Comment;
  isReply: boolean;
  onResolve?: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
  onReply?: (id: string) => void;
}) {
  return (
    <div className={cn(isReply && "ml-6 border-l border-border pl-2.5")}>
      <div className="flex items-center gap-2">
        <Avatar name={comment.authorName ?? "?"} src={comment.authorImage} size={20} />
        <span className="text-xs font-medium text-text">{comment.authorName}</span>
        <span className="text-xs text-text-faint">{new Date(comment.createdAt).toLocaleDateString()}</span>
      </div>
      <p className="mt-1.5 text-sm text-text">{comment.body}</p>
      <div className="mt-1.5 flex items-center gap-3">
        {onResolve ? (
          <button
            onClick={() => onResolve(comment.id, !comment.resolvedAt)}
            className="flex items-center gap-1 text-xs text-text-faint hover:text-text"
          >
            {comment.resolvedAt ? <RotateCcw className="size-3" /> : <Check className="size-3" />}
            {comment.resolvedAt ? "Reopen" : "Resolve"}
          </button>
        ) : null}
        {onReply ? (
          <button
            onClick={() => onReply(comment.id)}
            className="flex items-center gap-1 text-xs text-text-faint hover:text-text"
          >
            Reply
          </button>
        ) : null}
        <button
          onClick={() => onDelete(comment.id)}
          className="flex items-center gap-1 text-xs text-text-faint hover:text-destructive"
        >
          <X className="size-3" /> Delete
        </button>
      </div>
    </div>
  );
}

/** Mounted only while open — the caller wraps this in `<AnimatePresence>` and renders
 * it conditionally (`comments.open && <CommentsPanel key="comments-panel" .../>`) rather
 * than this component deciding internally, since AnimatePresence needs an actual
 * mount/unmount to detect in order to run the exit animation below. */
export function CommentsPanel({
  comments,
  members,
  targetBlockId,
  onClearTarget,
  onCreate,
  onResolve,
  onDelete,
}: {
  comments: Comment[];
  members: MemberOption[];
  targetBlockId: string | null;
  onClearTarget: () => void;
  onCreate: (body: string, mentionedUserIds: string[], blockId: string | null, parentCommentId: string | null) => void;
  onResolve: (id: string, resolved: boolean) => void;
  onDelete: (id: string) => void;
}) {
  const [showResolved, setShowResolved] = React.useState(false);
  const [replyingTo, setReplyingTo] = React.useState<string | null>(null);
  const reducedMotion = useReducedMotion();

  const topLevel = comments.filter((c) => !c.parentCommentId && (showResolved || !c.resolvedAt));
  const repliesByParent = new Map<string, Comment[]>();
  for (const comment of comments) {
    if (!comment.parentCommentId) continue;
    const list = repliesByParent.get(comment.parentCommentId) ?? [];
    list.push(comment);
    repliesByParent.set(comment.parentCommentId, list);
  }

  return (
    // `m.aside` (not `motion.aside`) reads its animation engine from the
    // `<LazyMotion>` provider in app-shell.tsx rather than bundling it directly here —
    // see that file's comment for why this matters on this route in particular.
    <m.aside
      initial={reducedMotion ? false : { x: 12, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={reducedMotion ? undefined : { x: 12, opacity: 0 }}
      transition={reducedMotion ? { duration: 0 } : { duration: 0.16, ease: "easeOut" }}
      className="flex h-full w-80 shrink-0 flex-col border-l border-border"
    >
      <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
        <h2 className="text-sm font-medium text-text">Comments</h2>
        <button onClick={() => setShowResolved((v) => !v)} className="text-xs text-text-faint hover:text-text">
          {showResolved ? "Hide resolved" : "Show resolved"}
        </button>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-3">
        {topLevel.length === 0 ? (
          <p className="flex flex-col items-center gap-2 py-10 text-center text-sm text-text-faint">
            <MessageSquare className="size-6" />
            No comments yet
          </p>
        ) : (
          topLevel.map((comment) => {
            const replies = repliesByParent.get(comment.id) ?? [];
            return (
              <div key={comment.id} className="rounded-md border border-border p-2.5">
                {comment.blockId ? (
                  <p className="mb-1.5 inline-block rounded bg-accent/10 p-2 text-xs font-medium text-accent">
                    On a block
                  </p>
                ) : null}
                <CommentRow comment={comment} isReply={false} onResolve={onResolve} onDelete={onDelete} onReply={setReplyingTo} />
                {replies.length > 0 ? (
                  <div className="mt-3 space-y-3">
                    {replies.map((reply) => (
                      <CommentRow key={reply.id} comment={reply} isReply onDelete={onDelete} />
                    ))}
                  </div>
                ) : null}
                {replyingTo === comment.id ? (
                  <div className="mt-3 ml-6">
                    <MentionComposer
                      members={members}
                      placeholder="Reply…"
                      autoFocus
                      onSubmit={(body, mentionedUserIds) => {
                        onCreate(body, mentionedUserIds, comment.blockId, comment.id);
                        setReplyingTo(null);
                      }}
                    />
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </div>

      <div className="border-t border-border p-2.5">
        {targetBlockId ? (
          <div className="mb-1.5 flex items-center justify-between rounded-md bg-selected px-3 py-2 text-xs text-text">
            <span>Commenting on selected block</span>
            <button onClick={onClearTarget} aria-label="Comment on the page instead" className="text-text-faint hover:text-text">
              <X className="size-3" />
            </button>
          </div>
        ) : null}
        <MentionComposer
          members={members}
          placeholder="Add a comment…"
          onSubmit={(body, mentionedUserIds) => onCreate(body, mentionedUserIds, targetBlockId, null)}
        />
      </div>
    </m.aside>
  );
}
