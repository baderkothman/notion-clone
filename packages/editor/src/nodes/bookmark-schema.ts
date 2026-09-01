import { Node, mergeAttributes } from "@tiptap/core";
import type { EditorEmbedService } from "../types";

export interface BookmarkAttrs {
  url: string;
  title: string;
  description: string;
  faviconUrl: string | null;
}

export interface BookmarkOptions {
  HTMLAttributes: Record<string, unknown>;
  embedService: EditorEmbedService | null;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    bookmark: {
      insertBookmarkPlaceholder: () => ReturnType;
    };
  }
}

/** See toggle-schema.ts's doc comment for why this is split from bookmark.tsx. */
export const BookmarkSchema = Node.create<BookmarkOptions>({
  name: "bookmark",
  group: "block",
  atom: true,
  selectable: true,

  addOptions() {
    return { HTMLAttributes: {}, embedService: null };
  },

  addAttributes() {
    return {
      url: { default: "" },
      title: { default: "" },
      description: { default: "" },
      faviconUrl: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='bookmark']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "bookmark" })];
  },

  addCommands() {
    return {
      insertBookmarkPlaceholder:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { url: "", title: "", description: "", faviconUrl: null } }),
    };
  },
});
