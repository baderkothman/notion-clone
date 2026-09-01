"use client";

import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { File } from "lucide-react";
import { ChildPageSchema, type ChildPageAttrs, type ChildPageOptions } from "./child-page-schema";

export { type ChildPageAttrs, type ChildPageOptions } from "./child-page-schema";

export const ChildPage = ChildPageSchema.extend({
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
