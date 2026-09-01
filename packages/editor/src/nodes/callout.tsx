"use client";

import { ReactNodeViewRenderer, NodeViewWrapper, NodeViewContent, type NodeViewProps } from "@tiptap/react";
import { CalloutSchema } from "./callout-schema";

export { type CalloutOptions } from "./callout-schema";

const COLORS = ["gray", "blue", "green", "yellow", "red", "purple"] as const;

export const Callout = CalloutSchema.extend({
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
