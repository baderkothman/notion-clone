"use client";

import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { ChevronRight } from "lucide-react";
import { ToggleSchema } from "./toggle-schema";

export { type ToggleOptions } from "./toggle-schema";

/** A collapsible block — Notion's "toggle list". Content stays in the document while
 * collapsed (so it's still saved/searched/exported); it's just visually hidden, which
 * keeps the schema simple compared to conditionally unmounting child nodes. Extends
 * `ToggleSchema` (see toggle-schema.ts) with the browser-only React node view. */
export const Toggle = ToggleSchema.extend({
  addNodeView() {
    return ReactNodeViewRenderer(ToggleView);
  },
});

function ToggleView({ node, updateAttributes }: NodeViewProps) {
  const open = node.attrs.open as boolean;

  return (
    <NodeViewWrapper className="my-0.5 flex items-start gap-1" data-open={open}>
      <button
        contentEditable={false}
        onClick={() => updateAttributes({ open: !open })}
        className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded hover:bg-hover"
        aria-expanded={open}
        aria-label={open ? "Collapse toggle" : "Expand toggle"}
      >
        <ChevronRight
          className="h-3.5 w-3.5 text-text-faint transition-transform"
          style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)" }}
        />
      </button>
      <NodeViewContent
        className="min-w-0 flex-1"
        style={{ display: open ? "block" : "none" }}
      />
    </NodeViewWrapper>
  );
}
