"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ChevronRight,
  File,
  MoreHorizontal,
  Plus,
  Star,
  Trash2,
  Copy,
  FileText,
} from "lucide-react";
import { cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@notion-clone/ui";
import type { PageTreeNode } from "@notion-clone/contracts";
import { listChildPagesAction, createPageAction, archivePageAction, duplicatePageAction, movePageAction, toggleFavoriteAction } from "@/app/(app)/actions/pages";

const DRAG_MIME = "application/x-notion-clone-page";

export function PageTreeItem({
  node,
  workspaceId,
  workspaceSlug,
  depth,
  onArchived,
}: {
  node: PageTreeNode;
  workspaceId: string;
  workspaceSlug: string;
  depth: number;
  onArchived?: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isActive = pathname === `/w/${workspaceSlug}/p/${node.id}`;

  const [expanded, setExpanded] = React.useState(false);
  const [children, setChildren] = React.useState<PageTreeNode[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [dropPosition, setDropPosition] = React.useState<"before" | "after" | "inside" | null>(null);

  async function toggleExpand(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!expanded && children === null) {
      setLoading(true);
      const result = await listChildPagesAction(workspaceId, node.id);
      setLoading(false);
      if (result.ok) setChildren(result.value);
    }
    setExpanded((v) => !v);
  }

  async function handleAddChild(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const result = await createPageAction({ workspaceId, parentId: node.id });
    if (!result.ok) return toast.error(result.error);
    setExpanded(true);
    setChildren((prev) => [
      ...(prev ?? []),
      {
        id: result.value.id,
        title: "",
        icon: null,
        type: "page",
        parentId: node.id,
        hasChildren: false,
        isArchived: false,
        sortKey: result.value.sortKey,
      },
    ]);
    router.push(`/w/${workspaceSlug}/p/${result.value.id}`);
  }

  async function handleArchive(e: Event) {
    e.preventDefault();
    const result = await archivePageAction({ pageId: node.id });
    if (!result.ok) return toast.error(result.error);
    toast.success("Moved to Trash");
    onArchived?.();
    if (isActive) router.push(`/w/${workspaceSlug}`);
  }

  async function handleDuplicate(e: Event) {
    e.preventDefault();
    const result = await duplicatePageAction({ pageId: node.id });
    if (!result.ok) return toast.error(result.error);
    toast.success("Page duplicated");
    onArchived?.();
  }

  async function handleFavorite(e: Event) {
    e.preventDefault();
    const result = await toggleFavoriteAction({ pageId: node.id, favorite: true });
    if (!result.ok) return toast.error(result.error);
    toast.success("Added to Favorites");
  }

  function handleDragStart(e: React.DragEvent) {
    e.dataTransfer.setData(DRAG_MIME, node.id);
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    setDropPosition(ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside");
  }

  function handleDragLeave() {
    setDropPosition(null);
  }

  async function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData(DRAG_MIME);
    const position = dropPosition;
    setDropPosition(null);
    if (!draggedId || draggedId === node.id || !position) return;

    const result = await movePageAction(
      position === "inside"
        ? { pageId: draggedId, newParentId: node.id }
        : position === "after"
          ? { pageId: draggedId, newParentId: node.parentId, afterSortKey: node.sortKey }
          : { pageId: draggedId, newParentId: node.parentId, beforeSortKey: node.sortKey },
    );
    if (!result.ok) return toast.error(result.error);
    onArchived?.();
  }

  return (
    <div>
      <div
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "group relative flex items-center gap-1 rounded-md py-1 pr-1 text-sm",
          isActive ? "bg-selected text-text" : "text-text-muted hover:bg-hover hover:text-text",
          dropPosition === "before" && "shadow-[inset_0_2px_0_0_var(--color-focus)]",
          dropPosition === "after" && "shadow-[inset_0_-2px_0_0_var(--color-focus)]",
          dropPosition === "inside" && "ring-1 ring-inset ring-focus",
        )}
        style={{ paddingLeft: 8 + depth * 16 }}
      >
        <button
          onClick={toggleExpand}
          className="flex h-4 w-4 shrink-0 items-center justify-center rounded hover:bg-border-strong"
          aria-label={expanded ? "Collapse" : "Expand"}
          aria-expanded={expanded}
        >
          <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
        </button>
        <Link href={`/w/${workspaceSlug}/p/${node.id}`} className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5">
          <span className="shrink-0 text-sm">
            {node.icon ?? (node.type === "database" ? <FileText className="h-3.5 w-3.5" /> : <File className="h-3.5 w-3.5" />)}
          </span>
          <span className="truncate">{node.title || "Untitled"}</span>
        </Link>
        <div className="hidden items-center gap-0.5 group-hover:flex">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-5 w-5 items-center justify-center rounded hover:bg-border-strong" aria-label="Page options">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onSelect={handleFavorite}>
                <Star className="h-3.5 w-3.5" /> Add to Favorites
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleDuplicate}>
                <Copy className="h-3.5 w-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={handleArchive}>
                <Trash2 className="h-3.5 w-3.5" /> Move to Trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <button
            onClick={handleAddChild}
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-border-strong"
            aria-label="Add a page inside"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      {expanded ? (
        <div>
          {loading ? (
            <div className="py-1 text-xs text-text-faint" style={{ paddingLeft: 8 + (depth + 1) * 16 }}>
              Loading…
            </div>
          ) : children && children.length > 0 ? (
            children.map((child) => (
              <PageTreeItem
                key={child.id}
                node={child}
                workspaceId={workspaceId}
                workspaceSlug={workspaceSlug}
                depth={depth + 1}
                onArchived={async () => {
                  const result = await listChildPagesAction(workspaceId, node.id);
                  if (result.ok) setChildren(result.value);
                }}
              />
            ))
          ) : (
            <div className="py-1 text-xs text-text-faint" style={{ paddingLeft: 8 + (depth + 1) * 16 }}>
              No pages inside
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
