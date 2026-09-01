"use client";

import * as React from "react";
import type { Editor } from "@tiptap/react";
import { GripVertical, Plus } from "lucide-react";

const DRAG_MIME = "application/x-notion-clone-block";

/**
 * The left-side gutter (⠿ drag handle, + insert-below) that follows the hovered
 * top-level block — Notion's signature block-level affordance. Positioning is done by
 * reading the DOM rect of the hovered `[data-block-id]` element rather than duplicating
 * ProseMirror's layout math. Reordering moves the whole top-level block (this editor's
 * blocks are Notion's "top-level" tree level; arbitrary recursive nesting of any block
 * under any other is intentionally out of scope for phase 1 — see docs/NOTION_PARITY.md).
 */
export function DragHandle({ editor }: { editor: Editor }) {
  const [hoveredId, setHoveredId] = React.useState<string | null>(null);
  const [rect, setRect] = React.useState<{ top: number; left: number; height: number } | null>(null);
  const containerRef = React.useRef<HTMLElement | null>(null);

  React.useEffect(() => {
    const dom = editor.view.dom as HTMLElement;
    containerRef.current = dom;
    const parent = dom.parentElement;
    if (!parent) return;

    function onMouseMove(e: MouseEvent) {
      const target = (e.target as HTMLElement).closest("[data-block-id]") as HTMLElement | null;
      if (!target) {
        setHoveredId(null);
        return;
      }
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
    const dom = editor.view.dom as HTMLElement;
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

    dom.parentElement?.addEventListener("dragover", onDragOver);
    dom.parentElement?.addEventListener("drop", onDrop);
    return () => {
      dom.parentElement?.removeEventListener("dragover", onDragOver);
      dom.parentElement?.removeEventListener("drop", onDrop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!hoveredId || !rect) return null;

  return (
    <div
      contentEditable={false}
      className="pointer-events-none absolute z-10 flex items-center gap-0.5"
      style={{ top: rect.top, left: -44, height: rect.height }}
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
    </div>
  );
}
