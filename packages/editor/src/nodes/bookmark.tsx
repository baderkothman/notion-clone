"use client";

import * as React from "react";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Link2, Loader2 } from "lucide-react";
import { BookmarkSchema, type BookmarkAttrs, type BookmarkOptions } from "./bookmark-schema";

export { type BookmarkAttrs, type BookmarkOptions } from "./bookmark-schema";

export const Bookmark = BookmarkSchema.extend({
  addNodeView() {
    return ReactNodeViewRenderer(BookmarkView);
  },
});

function BookmarkView({ node, updateAttributes, extension }: NodeViewProps) {
  const attrs = node.attrs as BookmarkAttrs;
  const { embedService } = extension.options as BookmarkOptions;
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const inputId = React.useId();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!embedService || !input.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const metadata = await embedService.fetchLinkMetadata(input.trim());
      updateAttributes({ ...metadata });
    } catch {
      setError("Couldn't load a preview for that link.");
    } finally {
      setLoading(false);
    }
  }

  if (!attrs.url) {
    return (
      <NodeViewWrapper contentEditable={false} className="my-1">
        <form onSubmit={handleSubmit} className="flex items-center gap-2 rounded-md border border-border p-2">
          <Link2 className="h-4 w-4 shrink-0 text-text-faint" />
          <div className="min-w-0 flex-1">
            <label htmlFor={inputId} className="block text-xs font-medium text-text-muted">
              Bookmark URL
            </label>
            <input
              id={inputId}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="https://example.com"
              className="w-full bg-transparent text-base outline-none placeholder:text-text-faint sm:text-sm"
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="shrink-0 rounded-md bg-accent px-2 py-1 text-xs font-medium text-accent-text disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Embed"}
          </button>
        </form>
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper contentEditable={false} className="my-1">
      <a
        href={attrs.url}
        target="_blank"
        rel="noopener noreferrer nofollow"
        className="flex items-start gap-3 rounded-md border border-border p-3 hover:bg-hover"
      >
        {attrs.faviconUrl ? (
          <img src={attrs.faviconUrl} alt="" className="mt-0.5 h-4 w-4 shrink-0" />
        ) : (
          <Link2 className="mt-0.5 h-4 w-4 shrink-0 text-text-faint" />
        )}
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-text">{attrs.title || attrs.url}</span>
          {attrs.description ? (
            <span className="mt-0.5 line-clamp-2 block text-xs text-text-muted">{attrs.description}</span>
          ) : null}
          <span className="mt-1 block truncate text-xs text-text-faint">{attrs.url}</span>
        </span>
      </a>
    </NodeViewWrapper>
  );
}
