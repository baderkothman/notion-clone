"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { BlockEditor, useAutosave, type AutosaveResult, type JSONContent, type Editor } from "@notion-clone/editor";
import {
  updatePageTitleAction,
  updatePageIconAction,
  updatePageCoverAction,
} from "@/app/(app)/actions/pages";
import { createPageAction } from "@/app/(app)/actions/pages";
import { saveDocumentAction } from "@/app/(app)/actions/blocks";
import { Breadcrumbs } from "./breadcrumbs";
import { PageIconPicker } from "./page-icon-picker";
import { PageCover } from "./page-cover";
import { PageTitle } from "./page-title";
import { PageMenu } from "./page-menu";
import { AutosaveIndicator } from "./autosave-indicator";
import { ShareDialog } from "./share-dialog";
import { HistoryPanel } from "./history-panel";
import { CommentsPanel } from "./comments-panel";
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

export function PageView({ workspaceId, workspaceSlug, page, content, documentVersion, breadcrumbTrail, editable }: PageViewProps) {
  const router = useRouter();
  const [icon, setIcon] = React.useState(page.icon);
  const [cover, setCover] = React.useState(page.coverImage);
  const [commentsOpen, setCommentsOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const editorRef = React.useRef<Editor | null>(null);

  const fileService = React.useMemo(() => createEditorFileService(workspaceId, page.id), [workspaceId, page.id]);

  const saveContent = React.useCallback(
    async (json: JSONContent, expectedVersion: number): Promise<AutosaveResult> => {
      const result = await saveDocumentAction({ pageId: page.id, content: json, expectedVersion });
      if (result.ok) return { ok: true, version: result.value.version };
      return { ok: false, error: result.error, conflict: result.code === "CONFLICT" };
    },
    [page.id],
  );

  const { status, scheduleSave } = useAutosave({ initialVersion: documentVersion, save: saveContent });

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

  return (
    <div className="flex h-full">
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
          <Breadcrumbs workspaceSlug={workspaceSlug} trail={breadcrumbTrail} />
          <div className="flex items-center gap-3">
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
            <div className="mt-4">
              <BlockEditor
                content={content}
                editable={editable}
                onUpdate={(json) => scheduleSave(json)}
                onEditorReady={(editor) => {
                  editorRef.current = editor;
                }}
                onNavigateToPage={(pageId) => router.push(`/w/${workspaceSlug}/p/${pageId}`)}
                onCreateChildPage={handleCreateChildPage}
                fileService={fileService}
                embedService={editorEmbedService}
              />
            </div>
          </div>
        </div>
      </div>

      <CommentsPanel pageId={page.id} open={commentsOpen} />
      <HistoryPanel pageId={page.id} open={historyOpen} onOpenChange={setHistoryOpen} onRestored={() => router.refresh()} />
    </div>
  );
}
