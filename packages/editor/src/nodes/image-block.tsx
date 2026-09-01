"use client";

import * as React from "react";
import { Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { ImageIcon, Loader2 } from "lucide-react";
import type { EditorFileService } from "../types";

export interface ImageBlockAttrs {
  fileId: string | null;
  alt: string;
}

export interface ImageBlockOptions {
  HTMLAttributes: Record<string, unknown>;
  fileService: EditorFileService | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    imageBlock: {
      insertImagePlaceholder: () => ReturnType;
    };
  }
}

/** Stores a `fileId`, not a URL — presigned S3 URLs expire, so the display URL is
 * fetched fresh on render (see ImageBlockView), which also means access is re-checked
 * server-side every time the image is viewed rather than baked into stored content. */
export const ImageBlock = Node.create<ImageBlockOptions>({
  name: "imageBlock",
  group: "block",
  atom: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {}, fileService: null };
  },

  addAttributes() {
    return {
      fileId: { default: null },
      alt: { default: "" },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='image-block']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "image-block" })];
  },

  addCommands() {
    return {
      insertImagePlaceholder:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { fileId: null, alt: "" } }),
    };
  },

  addNodeView() {
    return ReactNodeViewRenderer(ImageBlockView);
  },
});

function ImageBlockView({ node, updateAttributes, extension }: NodeViewProps) {
  const attrs = node.attrs as ImageBlockAttrs;
  const { fileService } = extension.options as ImageBlockOptions;
  const [url, setUrl] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!attrs.fileId || !fileService) return;
    let cancelled = false;
    fileService
      .getDownloadUrl(attrs.fileId)
      .then((downloadUrl) => !cancelled && setUrl(downloadUrl))
      .catch(() => !cancelled && setError("Couldn't load this image."));
    return () => {
      cancelled = true;
    };
  }, [attrs.fileId, fileService]);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !fileService) return;
    setError(null);
    try {
      const { fileId } = await fileService.upload(file);
      updateAttributes({ fileId, alt: file.name });
    } catch {
      setError("Upload failed. Please try again.");
    }
  }

  if (!attrs.fileId) {
    return (
      <NodeViewWrapper contentEditable={false} className="my-1">
        <button
          onClick={() => inputRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-md border border-dashed border-border py-8 text-sm text-text-muted hover:bg-hover"
        >
          <ImageIcon className="h-4 w-4" /> Click to upload an image
        </button>
        <input ref={inputRef} type="file" accept="image/*" hidden onChange={handleFileSelected} />
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper contentEditable={false} className="my-1">
      {url ? (
        <img src={url} alt={attrs.alt} className="max-h-150 rounded-md" />
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <div className="flex h-40 items-center justify-center rounded-md bg-hover">
          <Loader2 className="h-4 w-4 animate-spin text-text-faint" />
        </div>
      )}
    </NodeViewWrapper>
  );
}
