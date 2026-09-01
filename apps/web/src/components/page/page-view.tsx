"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BlockEditor, useAutosave, useCollaboration, type AutosaveResult, type JSONContent, type Editor } from "@notion-clone/editor";
import {
  updatePageTitleAction,
  updatePageIconAction,
  updatePageCoverAction,
} from "@/app/(app)/actions/pages";
import { createPageAction } from "@/app/(app)/actions/pages";
import { saveDocumentAction } from "@/app/(app)/actions/blocks";
import { mintRealtimeTokenAction } from "@/app/(app)/actions/realtime";
import { listWorkspaceMembersAction } from "@/app/(app)/actions/workspaces";
import {
  listCommentsAction,
  createCommentAction,
  resolveCommentAction,
  deleteCommentAction,
} from "@/app/(app)/actions/comments";
import { collaborationColorForUserId } from "@/lib/collaboration-color";
import { Breadcrumbs } from "./breadcrumbs";
import { PageIconPicker } from "./page-icon-picker";
import { PageCover } from "./page-cover";
import { PageTitle } from "./page-title";
import { PageMenu } from "./page-menu";
import { AutosaveIndicator } from "./autosave-indicator";
import { CollaborationPresence } from "./collaboration-presence";
import { ShareDialog } from "./share-dialog";
import { HistoryPanel } from "./history-panel";
import { CommentsPanel, type Comment } from "./comments-panel";
import type { MemberOption } from "./mention-composer";
import { createEditorFileService } from "./editor-file-service";
import { editorEmbedService } from "./editor-embed-service";

export interface PageViewProps {
  workspaceId: string;
  workspaceSlug: string;
  page: {
    id: string;
    title: string;
    icon: string | null;
    coverImage: string | null;
    visibility: "private" | "workspace";
    publicShareEnabled: boolean;
    publicShareToken: string | null;
  };
  content: JSONContent;
  documentVersion: number;
  breadcrumbTrail: { id: string; title: string; icon: string | null }[];
  editable: boolean;
  currentUser: { id: string; name: string };
  /** apps/realtime's WebSocket URL, or null when it's not configured for this
   * deployment — realtime collaboration degrades to the plain autosave editor rather
   * than failing when this is absent. Passed down as a plain string rather than a
   * `NEXT_PUBLIC_*` env var since the server already knows it and a Client Component
   * prop reaches the browser just as well without baking it into the JS bundle. */
  realtimeWsUrl: string | null;
}

function useDebouncedCallback<Args extends unknown[]>(fn: (...args: Args) => void, delayMs: number) {
  const timeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  return React.useCallback(
    (...args: Args) => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => fn(...args), delayMs);
    },
    [fn, delayMs],
  );
}

export function PageView({
  workspaceId,
  workspaceSlug,
  page,
  content,
  documentVersion,
  breadcrumbTrail,
  editable,
  currentUser,
  realtimeWsUrl,
}: PageViewProps) {
  const router = useRouter();
  const [icon, setIcon] = React.useState(page.icon);
  const [cover, setCover] = React.useState(page.coverImage);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [comments, setComments] = React.useState<Comment[]>([]);
  const [members, setMembers] = React.useState<MemberOption[]>([]);
  const [commentTargetBlockId, setCommentTargetBlockId] = React.useState<string | null>(null);
  const editorRef = React.useRef<Editor | null>(null);

  const fileService = React.useMemo(() => createEditorFileService(workspaceId, page.id), [workspaceId, page.id]);

  const refreshComments = React.useCallback(async () => {
    const result = await listCommentsAction(page.id);
    if (result.ok) setComments(result.value);
  }, [page.id]);

  // Comments (and who's commentable, for @mentions) are fetched once on mount — not
  // only when the panel opens — because the editor's right-margin comment badges need
  // to know which blocks have threads even while the panel is closed.
  React.useEffect(() => {
    void refreshComments();
    void listWorkspaceMembersAction(workspaceId).then((result) => {
      if (result.ok) setMembers(result.value.map((m) => ({ userId: m.userId, name: m.name, email: m.email, image: m.image })));
    });
  }, [refreshComments, workspaceId]);

  const commentedBlockIds = React.useMemo(
    () => new Set(comments.filter((c) => c.blockId && !c.resolvedAt).map((c) => c.blockId!)),
    [comments],
  );

  const saveContent = React.useCallback(
    async (json: JSONContent, expectedVersion: number): Promise<AutosaveResult> => {
      const result = await saveDocumentAction({ pageId: page.id, content: json, expectedVersion });
      if (result.ok) return { ok: true, version: result.value.version };
      return { ok: false, error: result.error, conflict: result.code === "CONFLICT" };
    },
    [page.id],
  );

  const { status, scheduleSave } = useAutosave({ initialVersion: documentVersion, save: saveContent });

  // Realtime is best-effort: only attempted when the deployment has apps/realtime
  // configured at all (`realtimeWsUrl`) and the viewer can actually edit — a read-only
  // viewer never opens a collaboration socket. See use-collaboration.ts.
  const realtimeEnabled = editable && !!realtimeWsUrl;
  const collabUser = React.useMemo(
    () => ({ name: currentUser.name, color: collaborationColorForUserId(currentUser.id) }),
    [currentUser.id, currentUser.name],
  );
  const fetchRealtimeToken = React.useCallback(async () => {
    const result = await mintRealtimeTokenAction(page.id);
    if (!result.ok) throw new Error(result.error);
    return result.value;
  }, [page.id]);
  const collaboration = useCollaboration({
    enabled: realtimeEnabled,
    pageId: page.id,
    wsUrl: realtimeWsUrl ?? "",
    user: collabUser,
    fetchToken: fetchRealtimeToken,
  });

  // A fresh Y.Doc starts empty — it's indistinguishable from an empty page until it's
  // actually synced with apps/realtime (see hasSyncedOnce's doc comment). Mounting the
  // editor on an unsynced Y.Doc would show (and let the user start typing into) empty
  // content while the *real* content sits one HTTP request away in `content` — and
  // saving from there would silently overwrite it. So the editor stays in plain mode,
  // reading `content` exactly as if realtime didn't exist, until sync is proven; only
  // then does it switch to the Yjs-backed collaborative mode. If sync never completes
  // (apps/realtime down, network trouble) this gives up after a few seconds rather than
  // showing a loading spinner forever — plain mode was always going to be the fallback.
  const [collabTimedOut, setCollabTimedOut] = React.useState(false);
  React.useEffect(() => {
    if (!realtimeEnabled || collaboration.hasSyncedOnce) return;
    const timeout = setTimeout(() => setCollabTimedOut(true), 5_000);
    return () => clearTimeout(timeout);
  }, [realtimeEnabled, collaboration.hasSyncedOnce]);

  const editorMode: "plain" | "collab" | "loading" = !realtimeEnabled
    ? "plain"
    : collaboration.hasSyncedOnce
      ? "collab"
      : collabTimedOut
        ? "plain"
        : "loading";

  // Once in collab mode, autosave stands down only while actually, provenly connected
  // right now — never merely "collab mode is active" — so a mid-session disconnect
  // doesn't leave content unsaved anywhere during the reconnect gap (harmless redundant
  // write once both paths are captured; see docs/ARCHITECTURE.md).
  const collabOwnsSaving = editorMode === "collab" && collaboration.status === "connected";

  const saveTitle = useDebouncedCallback((title: string) => {
    void updatePageTitleAction({ pageId: page.id, title });
  }, 500);

  async function handleIconChange(next: string | null) {
    setIcon(next);
    const result = await updatePageIconAction({ pageId: page.id, icon: next });
    if (!result.ok) toast.error(result.error);
  }

  async function handleCoverChange(next: string | null) {
    setCover(next);
    const result = await updatePageCoverAction({ pageId: page.id, coverImage: next });
    if (!result.ok) toast.error(result.error);
  }

  async function handleCreateChildPage() {
    const result = await createPageAction({ workspaceId, parentId: page.id });
    if (!result.ok) {
      toast.error(result.error);
      return null;
    }
    return { id: result.value.id, title: result.value.title, icon: result.value.icon };
  }

  function handleCommentBlock(blockId: string) {
    setCommentsOpen(true);
    setCommentTargetBlockId(blockId);
  }

  async function handleCreateComment(
    body: string,
    mentionedUserIds: string[],
    blockId: string | null,
    parentCommentId: string | null,
  ) {
    const result = await createCommentAction({ pageId: page.id, body, mentionedUserIds, blockId, parentCommentId });
    if (!result.ok) return toast.error(result.error);
    setCommentTargetBlockId(null);
    void refreshComments();
  }

  async function handleResolveComment(commentId: string, resolved: boolean) {
    const result = await resolveCommentAction({ commentId, resolved });
    if (!result.ok) return toast.error(result.error);
    void refreshComments();
  }

  async function handleDeleteComment(commentId: string) {
    const result = await deleteCommentAction({ commentId });
    if (!result.ok) return toast.error(result.error);
    void refreshComments();
  }

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
          <Breadcrumbs workspaceSlug={workspaceSlug} trail={breadcrumbTrail} />
          <div className="flex items-center gap-3">
            <CollaborationPresence
              status={editorMode === "plain" ? "disabled" : editorMode === "loading" ? "connecting" : collaboration.status}
              users={collaboration.connectedUsers}
            />
            <AutosaveIndicator status={status} onReload={() => router.refresh()} />
            <ShareDialog
              pageId={page.id}
              visibility={page.visibility}
              publicShareEnabled={page.publicShareEnabled}
              publicShareToken={page.publicShareToken}
            />
            <PageMenu
              pageId={page.id}
              workspaceSlug={workspaceSlug}
              onOpenHistory={() => setHistoryOpen(true)}
              onToggleComments={() => setCommentsOpen((v) => !v)}
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <PageCover coverImage={cover} onChange={handleCoverChange} />
          <div className="mx-auto max-w-3xl px-8 pb-24 pt-8">
            <PageIconPicker icon={icon} onChange={handleIconChange} />
            <div className="mt-2">
              <PageTitle
                initialTitle={page.title}
                onChange={saveTitle}
                onEnter={() => editorRef.current?.chain().focus("start").run()}
              />
            </div>
            <div className="relative mt-4">
              {editorMode === "loading" ? (
                // Brief and bounded (see the effect above) — waiting to confirm the
                // Y.Doc actually reflects the server's content before trusting it as an
                // editing surface. Not shown at all once realtime is unavailable or
                // already synced, so this never appears for most page loads.
                <div className="animate-pulse space-y-2" aria-hidden="true">
                  <div className="h-4 w-2/3 rounded bg-hover" />
                  <div className="h-4 w-1/2 rounded bg-hover" />
                </div>
              ) : (
                <BlockEditor
                  // A clean remount both if the page being viewed changes (defensive —
                  // see use-collaboration.ts's doc comment) and, deliberately, on the
                  // one-time "loading" -> "plain"/"collab" transition: nothing was
                  // editable during "loading", so there's no risk of losing in-flight
                  // keystrokes the way a mid-typing remount would carry.
                  key={`${page.id}:${editorMode}`}
                  content={content}
                  editable={editable}
                  onUpdate={(json) => {
                    if (collabOwnsSaving) return;
                    scheduleSave(json);
                  }}
                  onEditorReady={(editor) => {
                    editorRef.current = editor;
                  }}
                  onNavigateToPage={(pageId) => router.push(`/w/${workspaceSlug}/p/${pageId}`)}
                  onCreateChildPage={handleCreateChildPage}
                  fileService={fileService}
                  embedService={editorEmbedService}
                  onCommentBlock={handleCommentBlock}
                  commentedBlockIds={commentedBlockIds}
                  collaboration={
                    editorMode === "collab" && collaboration.ydoc
                      ? { document: collaboration.ydoc, provider: collaboration.provider ?? undefined, user: collabUser }
                      : undefined
                  }
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <CommentsPanel
        open={commentsOpen}
        comments={comments}
        members={members}
        targetBlockId={commentTargetBlockId}
        onClearTarget={() => setCommentTargetBlockId(null)}
        onCreate={handleCreateComment}
        onResolve={handleResolveComment}
        onDelete={handleDeleteComment}
      />
      <HistoryPanel pageId={page.id} open={historyOpen} onOpenChange={setHistoryOpen} onRestored={() => router.refresh()} />
    </div>
  );
}
