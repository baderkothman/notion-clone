"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { File } from "lucide-react";

export interface ChildPageAttrs {
  pageId: string;
  title: string;
  icon: string | null;
}

export interface ChildPageOptions {
  HTMLAttributes: Record<string, unknown>;
  /** Navigates to the child page — wired by the app (Next.js router) since the editor
   * package itself knows nothing about routing. */
  onNavigate: (pageId: string) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    childPage: {
      insertChildPage: (attrs: ChildPageAttrs) => ReturnType;
    };
  }
}

export const ChildPage = Node.create<ChildPageOptions>({
  name: "childPage",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { HTMLAttributes: {}, onNavigate: () => {} };
  },

  addAttributes() {
    return {
      pageId: { default: null },
      title: { default: "Untitled" },
      icon: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='child-page']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "child-page" })];
  },

  addCommands() {
    return {
      insertChildPage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ChildPageView);
  },
});

function ChildPageView({ node, extension }: NodeViewProps) {
  const attrs = node.attrs as ChildPageAttrs;
  const options = extension.options as ChildPageOptions;

  return (
    <NodeViewWrapper
      as="button"
      contentEditable={false}
      onClick={() => options.onNavigate(attrs.pageId)}
      className="my-0.5 flex w-full items-center gap-2 rounded-md border border-border px-3 py-2 text-left hover:bg-hover"
    >
      <span className="shrink-0 text-text-faint">{attrs.icon ?? <File className="h-4 w-4" />}</span>
      <span className="truncate text-sm font-medium text-text underline decoration-border underline-offset-2">
        {attrs.title || "Untitled"}
      </span>
    </NodeViewWrapper>
  );
}
