import { Node, mergeAttributes } from "@tiptap/core";

export interface ToggleOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    toggle: {
      setToggle: () => ReturnType;
    };
  }
}

/**
 * The plain schema half of the toggle node — attrs, parsing, serialization, and the
 * command, with no React node view. Split out from `toggle.tsx` so this same definition
 * can be shared by the browser editor (which extends it with a node view) and
 * apps/realtime's Hocuspocus server (which only needs the schema to losslessly convert
 * between Tiptap JSON and Yjs updates, and must not pull in React/DOM-only code — see
 * `../schema.ts`). Keeping exactly one Node.create() call for the schema means there's
 * no second place attrs/parseHTML/renderHTML could drift out of sync.
 */
export const ToggleSchema = Node.create<ToggleOptions>({
  name: "toggle",
  group: "block",
  content: "block+",
  defining: true,

  addOptions() {
    return { HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      open: {
        default: true,
        parseHTML: (el) => el.getAttribute("data-open") !== "false",
        renderHTML: (attrs) => ({ "data-open": String(attrs.open) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div[data-type='toggle']" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { "data-type": "toggle" }), 0];
  },

  addCommands() {
    return {
      setToggle:
        () =>
        ({ commands }) =>
          commands.wrapIn(this.name),
    };
  },
});
