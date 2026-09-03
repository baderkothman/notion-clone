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
      {/* `NodeViewContent` is the live, editable ProseMirror region for this node's
        children — it must stay mounted at all times (see the doc comment above), so
        collapsing animates a wrapper around it rather than ever unmounting or
        `display:none`-ing the content itself.

        The height animation is a plain CSS grid trick (a row track transitioning between
        `0fr` and `1fr`), not a JS animation library: this file is part of every route
        that renders a `BlockEditor`, including the public read-only share view, so a
        library dependency added here can't be scoped away the way it can in
        app-level components — it would ship to every reader of every public page.
        `transition-[grid-template-rows]` already respects the app-wide
        `prefers-reduced-motion` rule in globals.css, which forces all transition/animation
        durations to ~0 for users who've asked for it — no extra handling needed here.
        `inert` (a real DOM attribute, not a style) is what removes the content from the
        tab order and a11y tree while collapsed; the grid/overflow only animate the
        visual. */}
      <div
        className="grid min-w-0 flex-1 transition-[grid-template-rows] duration-150 ease-in-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden" inert={!open}>
          <NodeViewContent />
        </div>
      </div>
    </NodeViewWrapper>
  );
}
