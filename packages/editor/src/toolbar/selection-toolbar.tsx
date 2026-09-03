"use client";

import * as React from "react";
import { BubbleMenu, type Editor } from "@tiptap/react";
import { Bold, Italic, Underline, Strikethrough, Code, Link2, Highlighter } from "lucide-react";
import { cn } from "@notion-clone/ui";

const HIGHLIGHT_COLORS = ["#fef3c7", "#dcfce7", "#dbeafe", "#fce7f3", "#f3e8ff"];
const TEXT_COLORS = ["#eb5757", "#d9822b", "#2f9e44", "#2f80ed", "#8b5cf6"];

function ToolbarButton({
  active,
  onClick,
  label,
  children,
}: {
  active?: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "flex h-7 w-7 items-center justify-center rounded hover:bg-hover",
        active && "bg-hover text-accent",
      )}
    >
      {children}
    </button>
  );
}

/** The floating format toolbar shown when text is selected — Notion's signature
 * selection-driven formatting UI, as opposed to a persistent top toolbar. */
export function SelectionToolbar({ editor }: { editor: Editor }) {
  const [showColors, setShowColors] = React.useState(false);
  const [linkOpen, setLinkOpen] = React.useState(false);
  const [linkValue, setLinkValue] = React.useState("");
  const linkInputId = React.useId();

  return (
    <BubbleMenu
      editor={editor}
      // Tippy.js (which BubbleMenu wraps) manages `aria-expanded` on its reference
      // element by default — here that's the editor's own wrapper `<div>`, whose
      // implicit ARIA role (generic) doesn't permit that attribute at all, an
      // axe-core/WCAG "aria-allowed-attr" violation. `aria.expanded: false` tells Tippy
      // not to touch the reference's ARIA attributes; the toolbar's own visibility is
      // already conveyed by it simply not being in the DOM when hidden.
      tippyOptions={{ duration: 100, aria: { expanded: false } }}
      shouldShow={({ state }) => !state.selection.empty}
    >
      <div className="flex items-center gap-0.5 rounded-md border border-border bg-surface-raised p-1 shadow-[var(--color-shadow)]">
        <ToolbarButton label="Bold" active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Italic" active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Underline"
          active={editor.isActive("underline")}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <Underline className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton
          label="Strikethrough"
          active={editor.isActive("strike")}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        >
          <Strikethrough className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton label="Inline code" active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>

        <div className="mx-0.5 h-4 w-px bg-border" />

        <div className="relative">
          <ToolbarButton
            label="Link"
            active={editor.isActive("link")}
            onClick={() => {
              setLinkValue(editor.getAttributes("link").href ?? "");
              setLinkOpen((v) => !v);
            }}
          >
            <Link2 className="h-3.5 w-3.5" />
          </ToolbarButton>
          {linkOpen ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (linkValue.trim()) {
                  editor.chain().focus().extendMarkRange("link").setLink({ href: linkValue.trim() }).run();
                } else {
                  editor.chain().focus().extendMarkRange("link").unsetLink().run();
                }
                setLinkOpen(false);
              }}
              className="absolute left-0 top-9 z-10 w-56 rounded-md border border-border bg-surface-raised p-1.5 shadow-[var(--color-shadow)]"
            >
              <label htmlFor={linkInputId} className="mb-1 block px-1 text-xs font-medium text-text-muted">
                Link URL
              </label>
              <input
                id={linkInputId}
                autoFocus
                value={linkValue}
                onChange={(e) => setLinkValue(e.target.value)}
                placeholder="https://example.com"
                className="w-full bg-transparent px-1 text-base outline-none sm:text-xs"
              />
            </form>
          ) : null}
        </div>

        <div className="relative">
          <ToolbarButton label="Highlight color" onClick={() => setShowColors((v) => !v)}>
            <Highlighter className="h-3.5 w-3.5" />
          </ToolbarButton>
          {showColors ? (
            <div className="absolute left-0 top-9 z-10 flex flex-col gap-2 rounded-md border border-border bg-surface-raised p-2 shadow-[var(--color-shadow)]">
              <div className="flex items-center gap-1">
                {TEXT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      editor.chain().focus().setColor(color).run();
                      setShowColors(false);
                    }}
                    className="h-5 w-5 rounded-full border border-border-strong"
                    style={{ backgroundColor: color }}
                    aria-label={`Text color ${color}`}
                  />
                ))}
              </div>
              <div className="flex items-center gap-1">
                {HIGHLIGHT_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => {
                      editor.chain().focus().toggleHighlight({ color }).run();
                      setShowColors(false);
                    }}
                    className="h-5 w-5 rounded-full border border-border-strong"
                    style={{ backgroundColor: color }}
                    aria-label={`Highlight ${color}`}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </BubbleMenu>
  );
}
