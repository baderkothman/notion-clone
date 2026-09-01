"use client";

import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";

export interface CalloutOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { emoji?: string; color?: string }) => ReturnType;
    };
  }
}

const COLORS = ["gray", "blue", "green", "yellow", "red", "purple"] as const;

export const Callout = Node.create<CalloutOptions>({
  name: "callout",
  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      emoji: { default: "💡" },
      color: { default: "gray" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='callout']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "callout" }), 0];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) =>
          commands.wrapIn(this.name, attrs),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(CalloutView);
  },
});

const colorClasses: Record<string, string> = {
  gray: "bg-hover",
  blue: "bg-[color-mix(in_srgb,var(--color-focus)_12%,transparent)]",
  green: "bg-[color-mix(in_srgb,var(--color-success)_14%,transparent)]",
  yellow: "bg-[color-mix(in_srgb,var(--color-warning)_16%,transparent)]",
  red: "bg-[color-mix(in_srgb,var(--color-destructive)_12%,transparent)]",
  purple: "bg-[color-mix(in_srgb,#8b5cf6_14%,transparent)]",
};

function CalloutView({ node, updateAttributes }: NodeViewProps) {
  const emoji = node.attrs.emoji as string;
  const color = node.attrs.color as string;

  function cycleColor() {
    const index = COLORS.indexOf(color as (typeof COLORS)[number]);
    updateAttributes({ color: COLORS[(index + 1) % COLORS.length] });
  }

  return (
    <NodeViewWrapper className={`my-1 flex items-start gap-2 rounded-md p-3 ${colorClasses[color] ?? colorClasses.gray}`}>
      <button
        contentEditable={false}
        onClick={cycleColor}
        className="shrink-0 select-none rounded text-lg leading-none hover:opacity-70"
        aria-label="Change callout color"
      >
        {emoji}
      </button>
      <NodeViewContent className="min-w-0 flex-1" />
    </NodeViewWrapper>
  );
}
