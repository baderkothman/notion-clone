"use client";

import * as React from "react";
import type { Editor } from "@tiptap/react";
import { GripVertical, MessageSquarePlus, Plus } from "lucide-react";

const DRAG_MIME = "application/x-notion-clone-block";

/**
 * The left-side gutter (⠿ drag handle, + insert-below, comment) that follows the
 * hovered top-level block — Notion's signature block-level affordance. Positioning is
 * done by reading the DOM rect of the hovered `[data-block-id]` element rather than
 * duplicating ProseMirror's layout math. Reordering moves the whole top-level block
 * (this editor's blocks are Notion's "top-level" tree level; arbitrary recursive
 * nesting of any block under any other is intentionally out of scope for phase 1 — see
 * docs/NOTION_PARITY.md). `onCommentBlock` is optional so the handle still works for
 * hosts that haven't wired up commenting (e.g. none today, but keeps the component
 * usable standalone).
 */
export function DragHandle({
  editor,
  container,
  onCommentBlock,
}: {
  editor: Editor;
  /** The actual outer wrapper that contains both the editor content and this gutter —
   * see the comment in block-editor.tsx for why this can't be derived from
   * `editor.view.dom.parentElement`. */
  container: React.RefObject<HTMLDivElement | null>;
  onCommentBlock?: (blockId: string) => void;
}) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [rect, setRect] = React.useState<{ top: number; left: number; height: number } | null>(null);
  const gutterRef = React.useRef<HTMLDivElement | null>(null);
  // Measured, not hardcoded: the row is 2 buttons (Insert, Drag) or 3 (+ Comment, when
  // `onCommentBlock` is wired up) — a fixed offset sized for one case overlaps the
  // block's own text in the other. Starts at the widest (3-button) case so there's
  // never a frame where an unmeasured gutter overlaps content; `useLayoutEffect` then
  // corrects it before paint whenever the hovered block (and therefore this row)
  // (re)mounts.
  const [gutterWidth, setGutterWidth] = React.useState(76);
  const GUTTER_GAP = 8; // breathing room between the gutter and the block's left edge

  React.useLayoutEffect(() => {
    if (gutterRef.current) setGutterWidth(gutterRef.current.offsetWidth);
  }, [hoveredId, onCommentBlock]);

  React.useEffect(() => {
    const parent = container.current;
    if (!parent) return;

    function onMouseMove(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("[data-block-id]") as HTMLElement | null;
      // Not over a block — this includes the gutter itself (a sibling of the blocks,
      // not a descendant of any `[data-block-id]` element), so this must NOT clear the
      // current hover: doing so unmounts the gutter the instant the pointer reaches it,
      // before a click can land. Hover only clears via `mouseleave` on the container
      // (truly leaving), not merely "not currently over a block".
      if (!target) return;
      const containerBox = parent!.getBoundingClientRect();
      const box = target.getBoundingClientRect();
      setHoveredId(target.getAttribute("data-block-id"));
      setRect({ top: box.top - containerBox.top, left: box.left - containerBox.left, height: box.height });
    }
    function onMouseLeave() {
      setHoveredId(null);
    }

    parent.style.position = "relative";
    parent.addEventListener("mousemove", onMouseMove);
    parent.addEventListener("mouseleave", onMouseLeave);
    return () => {
      parent.removeEventListener("mousemove", onMouseMove);
      parent.removeEventListener("mouseleave", onMouseLeave);
    };
  }, [editor]);

  function findBlockPos(blockId: string): { pos: number; node: import("@tiptap/pm/model").Node } | null {
    let found: { pos: number; node: import("@tiptap/pm/model").Node } | null = null;
    editor.state.doc.forEach((node, offset) => {
      if (found) return;
      if (node.attrs?.blockId === blockId) found = { pos: offset, node };
    });
    return found;
  }

  function handleAdd() {
    if (!hoveredId) return;
    const target = findBlockPos(hoveredId);
    if (!target) return;
    const insertPos = target.pos + target.node.nodeSize;
    editor.chain().focus().insertContentAt(insertPos, { type: "paragraph" }).setTextSelection(insertPos + 1).run();
  }

  function handleDragStart(e: React.DragEvent) {
    if (!hoveredId) return;
    e.dataTransfer.setData(DRAG_MIME, hoveredId);
    e.dataTransfer.effectAllowed = "move";
  }

  React.useEffect(() => {
    const dom = container.current;
    if (!dom) return;
    function onDragOver(e: DragEvent) {
      if (!e.dataTransfer?.types.includes(DRAG_MIME)) return;
      e.preventDefault();
    }
    function onDrop(e: DragEvent) {
      if (!e.dataTransfer?.types.includes(DRAG_MIME)) return;
      e.preventDefault();
      const draggedId = e.dataTransfer.getData(DRAG_MIME);
      const targetEl = (e.target as HTMLElement).closest("[data-block-id]") as HTMLElement | null;
      const targetId = targetEl?.getAttribute("data-block-id");
      if (!draggedId || !targetId || draggedId === targetId) return;

      const dragged = findBlockPos(draggedId);
      const target = findBlockPos(targetId);
      if (!dragged || !target) return;

      const rectEl = targetEl!.getBoundingClientRect();
      const insertAfter = e.clientY > rectEl.top + rectEl.height / 2;

      const tr = editor.state.tr;
      const draggedNode = dragged.node;
      tr.delete(dragged.pos, dragged.pos + draggedNode.nodeSize);

      // Recompute target position after deletion (positions shift if dragged block was
      // earlier in the document than the target).
      const mappedTargetPos = tr.mapping.map(target.pos);
      const insertPos = insertAfter ? mappedTargetPos + tr.doc.nodeAt(mappedTargetPos)!.nodeSize : mappedTargetPos;
      tr.insert(insertPos, draggedNode);
      editor.view.dispatch(tr);
    }

    dom.addEventListener("dragover", onDragOver);
    dom.addEventListener("drop", onDrop);
    return () => {
      dom.removeEventListener("dragover", onDragOver);
      dom.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!hoveredId || !rect) return null;

  return (
    <div
      ref={gutterRef}
      contentEditable={false}
      className="pointer-events-none absolute z-10 flex items-center gap-0.5"
      style={{ top: rect.top, left: -(gutterWidth + GUTTER_GAP), height: rect.height }}
    >
      <button
        onClick={handleAdd}
        className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded text-text-faint hover:bg-hover"
        aria-label="Insert block below"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
      <button
        draggable
        onDragStart={handleDragStart}
        className="pointer-events-auto flex h-6 w-6 cursor-grab items-center justify-center rounded text-text-faint hover:bg-hover active:cursor-grabbing"
        aria-label="Drag to move block"
      >
        <GripVertical className="h-3.5 w-3.5" />
      </button>
      {onCommentBlock ? (
        <button
          onClick={() => onCommentBlock(hoveredId)}
          className="pointer-events-auto flex h-6 w-6 items-center justify-center rounded text-text-faint hover:bg-hover"
          aria-label="Comment on this block"
        >
          <MessageSquarePlus className="h-3.5 w-3.5" />
        </button>
      ) : null}
    </div>
  );
}
