"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
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
type DropPosition = "before" | "after" | "inside";

function moveInputForDrop(draggedId: string, node: PageTreeNode, position: DropPosition) {
  if (position === "inside") return { pageId: draggedId, newParentId: node.id };
  if (position === "after") {
    return { pageId: draggedId, newParentId: node.parentId, afterSortKey: node.sortKey };
  }
  return { pageId: draggedId, newParentId: node.parentId, beforeSortKey: node.sortKey };
}

function usePageDrag(node: PageTreeNode, onMoved?: () => void) {
  const [dropPosition, setDropPosition] = React.useState<DropPosition | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  function onDragStart(e: React.DragEvent) {
    e.dataTransfer.setData(DRAG_MIME, node.id);
    e.dataTransfer.effectAllowed = "move";
    setIsDragging(true);
  }

  function onDragOver(e: React.DragEvent) {
    if (!e.dataTransfer.types.includes(DRAG_MIME)) return;
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    setDropPosition(ratio < 0.25 ? "before" : ratio > 0.75 ? "after" : "inside");
  }

  async function onDrop(e: React.DragEvent) {
    e.preventDefault();
    const draggedId = e.dataTransfer.getData(DRAG_MIME);
    const position = dropPosition;
    setDropPosition(null);
    if (!draggedId || draggedId === node.id || !position) return;

    const result = await movePageAction(moveInputForDrop(draggedId, node, position));
    if (!result.ok) return toast.error(result.error);
    onMoved?.();
  }

  return {
    dropPosition,
    isDragging,
    handlers: {
      onDragStart,
      onDragEnd: () => setIsDragging(false),
      onDragOver,
      onDragLeave: () => setDropPosition(null),
      onDrop,
    },
  };
}

function PageTreeChildren({
  expanded,
  loading,
  childNodes,
  workspaceId,
  workspaceSlug,
  depth,
  onArchived,
}: {
  expanded: boolean;
  loading: boolean;
  childNodes: PageTreeNode[] | null;
  workspaceId: string;
  workspaceSlug: string;
  depth: number;
  onArchived: () => void;
}) {
  if (!expanded) return null;

  if (loading) {
    return (
      <div className="py-1 text-xs text-text-faint" style={{ paddingLeft: 8 + (depth + 1) * 16 }}>
        Loading…
      </div>
    );
  }

  if (!childNodes?.length) {
    return (
      <div className="py-1 text-xs text-text-faint" style={{ paddingLeft: 8 + (depth + 1) * 16 }}>
        No pages inside
      </div>
    );
  }

  return childNodes.map((child) => (
    <PageTreeItem
      key={child.id}
      node={child}
      workspaceId={workspaceId}
      workspaceSlug={workspaceSlug}
      depth={depth + 1}
      onArchived={onArchived}
    />
  ));
}

/** Memoized: a page tree can get deep and wide, and `handleDragOver` fires on every
 * mousemove while dragging — without memoization, dragging over one row would
 * re-render its entire (potentially large) rendered subtree of already-expanded
 * children on every one of those events, not just the row being dragged over. This only
 * pays off because `onArchived` is a stable callback at every call site (see `refresh`
 * in page-tree.tsx and `refreshChildren` below) and `node` keeps its identity unless
 * that specific page's own data actually changed. */
export const PageTreeItem = React.memo(function PageTreeItem({
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
  const { dropPosition, isDragging, handlers: dragHandlers } = usePageDrag(node, onArchived);
  const reducedMotion = useReducedMotion();

  async function toggleExpand(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!expanded && children === null) {
      setLoading(true);
      try {
        const result = await listChildPagesAction(workspaceId, node.id);
        if (result.ok) setChildren(result.value);
      } finally {
        setLoading(false);
      }
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

  // Stable across re-renders (deps are the props that identify which children to
  // re-fetch) so passing it as this row's children's own `onArchived` prop doesn't
  // defeat their memoization every time this row itself re-renders.
  const refreshChildren = React.useCallback(async () => {
    const result = await listChildPagesAction(workspaceId, node.id);
    if (result.ok) setChildren(result.value);
  }, [workspaceId, node.id]);

  return (
    <div>
      {/* The drop-position indicator (the `shadow-[inset_...]`/`ring` classes below,
        driven by `dropPosition`) is unchanged — it stays a plain CSS shadow, since that's
        applied to whichever row the user is dragging *over*, not the one being dragged.
        The motion here is separate: a lift/settle on this row's own element as *it*
        starts and stops being dragged, matching the "picked up" feel of Notion's own
        sidebar. Native HTML5 drag-and-drop already renders its own ghost image during the
        drag — this scales/dims the source element left behind, not the ghost.

        The native `draggable`/`onDrag*` handlers live on this plain outer `div` rather
        than directly on the `m.div` below: motion's own props of the same name are typed
        for its pointer-based `drag` gesture system, not native HTML5 dataTransfer-based
        drag events, so the two can't share one element.

        `m` (not `motion`) from "motion/react-m": the smaller, tree-shakeable component
        that reads its animation engine from the `<LazyMotion>` provider in app-shell.tsx
        instead of bundling it directly — see that file's comment for why. */}
      <div draggable {...dragHandlers}>
        <m.div
          animate={{ transform: isDragging ? "scale(1.02)" : "scale(1)", opacity: isDragging ? 0.6 : 1 }}
          transition={reducedMotion ? { duration: 0 } : { duration: 0.12 }}
          className={cn(
            "group relative flex items-center gap-1 rounded-md py-1 pr-1 text-sm",
            isActive ? "bg-selected text-text" : "text-text-muted hover:bg-hover hover:text-text",
            isDragging && "shadow-md",
            dropPosition === "before" && "shadow-[inset_0_2px_0_0_var(--color-focus)]",
            dropPosition === "after" && "shadow-[inset_0_-2px_0_0_var(--color-focus)]",
            dropPosition === "inside" && "ring-1 ring-inset ring-focus",
          )}
          style={{ paddingLeft: 8 + depth * 16 }}
        >
          <button
            onClick={toggleExpand}
            className="flex size-4 shrink-0 items-center justify-center rounded hover:bg-border-strong"
            aria-label={expanded ? "Collapse" : "Expand"}
            aria-expanded={expanded}
          >
            <ChevronRight className={cn("h-3 w-3 transition-transform", expanded && "rotate-90")} />
          </button>
          <Link href={`/w/${workspaceSlug}/p/${node.id}`} className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5">
            <span className="shrink-0 text-sm">
              {node.icon ?? (node.type === "database" ? <FileText className="size-3.5" /> : <File className="size-3.5" />)}
            </span>
            <span className="truncate">{node.title || "Untitled"}</span>
          </Link>
          {/* Always in the DOM (not `hidden`/`display:none`) so it's reachable by Tab
            and tappable on touch — a `display:none` element can never receive keyboard
            focus at all. Visible by default (small screens/touch, no reliable hover),
            and hover-revealed only from `sm:` up, where a pointer that can hover is the
            norm; `group-focus-within` still reveals it there for keyboard users
            regardless of screen size. */}
          <div className="flex items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex size-5 items-center justify-center rounded hover:bg-border-strong" aria-label="Page options">
                  <MoreHorizontal className="size-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onSelect={handleFavorite}>
                  <Star className="size-3.5" /> Add to Favorites
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={handleDuplicate}>
                  <Copy className="size-3.5" /> Duplicate
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem destructive onSelect={handleArchive}>
                  <Trash2 className="size-3.5" /> Move to Trash
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <button
              onClick={handleAddChild}
              className="flex size-5 items-center justify-center rounded hover:bg-border-strong"
              aria-label="Add a page inside"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </m.div>
      </div>
      <PageTreeChildren
        expanded={expanded}
        loading={loading}
        childNodes={children}
        workspaceId={workspaceId}
        workspaceSlug={workspaceSlug}
        depth={depth}
        onArchived={refreshChildren}
      />
    </div>
  );
});
