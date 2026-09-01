import { Node, mergeAttributes } from "@tiptap/core";

export interface ChildPageAttrs {
  pageId: string;
  title: string;
  icon: string | null;
}

export interface ChildPageOptions {
  HTMLAttributes: Record<string, unknown>;
  /** Navigates to the child page — wired by the app (Next.js router) since the editor
   * package itself knows nothing about routing. */
  onNavigate: (pageId: string) => void;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    childPage: {
      insertChildPage: (attrs: ChildPageAttrs) => ReturnType;
    };
  }
}

/** See toggle-schema.ts's doc comment for why this is split from child-page.tsx. */
export const ChildPageSchema = Node.create<ChildPageOptions>({
  name: "childPage",
  group: "block",
  atom: true,
  selectable: true,
  draggable: false,

  addOptions() {
    return { HTMLAttributes: {}, onNavigate: () => {} };
  },

  addAttributes() {
    return {
      pageId: { default: null },
      title: { default: "Untitled" },
      icon: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='child-page']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "child-page" })];
  },

  addCommands() {
    return {
      insertChildPage:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});
