import { Node, mergeAttributes } from "@tiptap/core";
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

/** See toggle-schema.ts's doc comment for why this is split from file-block.tsx. */
export const FileBlockSchema = Node.create<FileBlockOptions>({
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
});
