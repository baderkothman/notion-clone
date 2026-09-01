"use client";

import * as React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { File as FileIcon, Loader2, Paperclip } from "lucide-react";
import type { EditorFileService } from "../types";

export interface FileBlockAttrs {
  fileId: string | null;
  filename: string;
  sizeBytes: number;
}

export interface FileBlockOptions {
  HTMLAttributes: Record<string, unknown>;
  fileService: EditorFileService | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    fileBlock: {
      insertFilePlaceholder: () => ReturnType;
    };
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export const FileBlock = Node.create<FileBlockOptions>({
  name: "fileBlock",
  group: "block",
  atom: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {}, fileService: null };
  },

  addAttributes() {
    return {
      fileId: { default: null },
      filename: { default: "" },
      sizeBytes: { default: 0 },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='file-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "file-block" })];
  },

  addCommands() {
    return {
      insertFilePlaceholder:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { fileId: null, filename: "", sizeBytes: 0 } }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(FileBlockView);
  },
});

function FileBlockView({ node, updateAttributes, extension }: NodeViewProps) {
  const attrs = node.attrs as FileBlockAttrs;
  const { fileService } = extension.options as FileBlockOptions;
  const [error, setError] = React.useState<string | null>(null);
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !fileService) return;
    setError(null);
    setUploading(true);
    try {
      const { fileId, filename, sizeBytes } = await fileService.upload(file);
      updateAttributes({ fileId, filename, sizeBytes });
    } catch {
      setError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleDownload() {
    if (!attrs.fileId || !fileService) return;
    const url = await fileService.getDownloadUrl(attrs.fileId);
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!attrs.fileId) {
    return (
      <NodeViewWrapper contentEditable={false} className="my-1">
        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex w-full items-center gap-2 rounded-md border border-dashed border-border px-3 py-2.5 text-sm text-text-muted hover:bg-hover"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
          {uploading ? "Uploading…" : "Click to attach a file"}
        </button>
        <input ref={inputRef} type="file" hidden onChange={handleFileSelected} />
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper contentEditable={false} className="my-1">
      <button
        onClick={handleDownload}
        className="flex w-full items-center gap-2 rounded-md border border-border px-3 py-2.5 text-left hover:bg-hover"
      >
        <FileIcon className="h-4 w-4 shrink-0 text-text-faint" />
        <span className="min-w-0 flex-1 truncate text-sm text-text">{attrs.filename}</span>
        <span className="shrink-0 text-xs text-text-faint">{formatSize(attrs.sizeBytes)}</span>
      </button>
    </NodeViewWrapper>
  );
}
