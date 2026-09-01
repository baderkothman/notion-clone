import { Node, mergeAttributes } from "@tiptap/core";
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

/** See toggle-schema.ts's doc comment for why this is split from image-block.tsx.
 * Stores a `fileId`, not a URL — presigned S3 URLs expire, so the display URL is
 * fetched fresh on render (see ImageBlockView), which also means access is re-checked
 * server-side every time the image is viewed rather than baked into stored content. */
export const ImageBlockSchema = Node.create<ImageBlockOptions>({
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
});
