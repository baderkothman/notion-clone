"use client";

import * as React from "react";
import type { Editor } from "@tiptap/react";
import { MessageSquare } from "lucide-react";

interface BlockRect {
  blockId: string;
  top: number;
  height: number;
}

/**
 * Right-margin badges marking which blocks have an open comment thread — Notion's
 * "there's a discussion here" affordance, visible without hovering (unlike the
 * hover-only drag handle on the left). Recomputed whenever the set of commented blocks
 * changes or the document reflows (scroll/resize), since block positions shift as
 * content above them changes height.
 */
export function CommentIndicators({
  editor,
  container,
  commentedBlockIds,
  onOpenBlock,
}: {
  editor: Editor;
  /** See the matching prop on DragHandle — the actual outer wrapper these badges are
   * positioned relative to, not `editor.view.dom.parentElement`. */
  container: React.RefObject<HTMLDivElement | null>;
  commentedBlockIds: Set<string>;
  onOpenBlock: (blockId: string) => void;
}) {
  const [rects, setRects] = React.useState<BlockRect[]>([]);

  const recompute = React.useCallback(() => {
    const dom = editor.view.dom as HTMLElement;
    const parent = container.current;
    if (!parent) return;
    const containerBox = parent.getBoundingClientRect();

    const next: BlockRect[] = [];
    for (const blockId of commentedBlockIds) {
      const el = dom.querySelector<HTMLElement>(`[data-block-id="${blockId}"]`);
      if (!el) continue;
      const box = el.getBoundingClientRect();
      next.push({ blockId, top: box.top - containerBox.top, height: box.height });
    }
    setRects(next);
  }, [editor, commentedBlockIds]);

  React.useEffect(() => {
    recompute();
    editor.on("update", recompute);
    window.addEventListener("resize", recompute);
    return () => {
      editor.off("update", recompute);
      window.removeEventListener("resize", recompute);
    };
  }, [editor, recompute]);

  if (rects.length === 0) return null;

  return (
    <>
      {rects.map((rect) => (
        <button
          key={rect.blockId}
          contentEditable={false}
          onClick={() => onOpenBlock(rect.blockId)}
          className="absolute z-10 flex h-5 w-5 items-center justify-center rounded text-accent hover:bg-hover"
          style={{ top: rect.top, right: -28, height: rect.height > 20 ? undefined : 20 }}
          aria-label="View comment thread on this block"
        >
          <MessageSquare className="h-3.5 w-3.5 fill-current" />
        </button>
      ))}
    </>
  );
}
