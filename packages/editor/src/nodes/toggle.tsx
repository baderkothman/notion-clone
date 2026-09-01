"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { ChevronRight } from "lucide-react";

export interface ToggleOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggle: {
      setToggle: () => ReturnType;
    };
  }
}

/** A collapsible block — Notion's "toggle list". Content stays in the document while
 * collapsed (so it's still saved/searched/exported); it's just visually hidden, which
 * keeps the schema simple compared to conditionally unmounting child nodes. */
export const Toggle = Node.create<ToggleOptions>({
  name: "toggle",
  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-open") !== "false",
        renderHTML: (attrs) => ({ "data-open": String(attrs.open) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='toggle']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "toggle" }), 0];
  },

  addCommands() {
    return {
      setToggle:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name),
    };
  },

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
