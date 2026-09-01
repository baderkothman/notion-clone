import { Extension, type Editor, type Range } from "@tiptap/core";
import Suggestion, { type SuggestionOptions } from "@tiptap/suggestion";
import tippy, { type Instance as TippyInstance } from "tippy.js";
import { createRoot, type Root } from "react-dom/client";
import { createElement } from "react";
import { slashMenuItems, type SlashMenuItem } from "./items";
import { SlashMenuList, type SlashMenuListHandle } from "./menu-view";

export interface SlashCommandOptions {
  /** Optional: adds a "Page" entry that creates a real child page (async, needs the
   * host app's page-creation API) rather than just inserting a placeholder node. */
  onCreateChildPage?: () => Promise<{ id: string; title: string; icon: string | null } | null>;
}

function buildItems(options: SlashCommandOptions): SlashMenuItem[] {
  const items = [...slashMenuItems];
  if (options.onCreateChildPage) {
    items.splice(1, 0, {
      key: "page",
      title: "Page",
      subtitle: "Create a nested page",
      icon: "📄",
      keywords: ["page", "subpage", "child"],
      command: (editor: Editor, range: Range) => {
        editor.chain().focus().deleteRange(range).run();
        void options.onCreateChildPage!().then((page) => {
          if (page) editor.chain().focus().insertChildPage({ pageId: page.id, title: page.title, icon: page.icon }).run();
        });
      },
    });
  }
  return items;
}

export const SlashCommand = Extension.create<SlashCommandOptions>({
  name: "slashCommand",

  addOptions() {
    return { onCreateChildPage: undefined };
  },

  addProseMirrorPlugins() {
    const options = this.options;

    const suggestion: Omit<SuggestionOptions<SlashMenuItem>, "editor"> = {
      char: "/",
      startOfLine: false,
      items: ({ query }) => {
        const all = buildItems(options);
        if (!query) return all;
        const q = query.toLowerCase();
        return all.filter(
          (item) => item.title.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q)),
        );
      },
      command: ({ editor, range, props }) => {
        (props as SlashMenuItem).command(editor, range);
      },
      render: () => {
        let root: Root | null = null;
        let container: HTMLDivElement | null = null;
        let popup: TippyInstance[] = [];
        let listRef: SlashMenuListHandle | null = null;

        return {
          onStart: (props) => {
            container = document.createElement("div");
            root = createRoot(container);
            root.render(
              createElement(SlashMenuList, {
                items: props.items,
                command: (item: SlashMenuItem) => props.command(item),
                ref: (handle: SlashMenuListHandle | null) => {
                  listRef = handle;
                },
              }),
            );

            if (!props.clientRect) return;
            popup = tippy("body", {
              getReferenceClientRect: props.clientRect as () => DOMRect,
              appendTo: () => document.body,
              content: container,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
            });
          },
          onUpdate: (props) => {
            root?.render(
              createElement(SlashMenuList, {
                items: props.items,
                command: (item: SlashMenuItem) => props.command(item),
                ref: (handle: SlashMenuListHandle | null) => {
                  listRef = handle;
                },
              }),
            );
            if (props.clientRect) {
              popup[0]?.setProps({ getReferenceClientRect: props.clientRect as () => DOMRect });
            }
          },
          onKeyDown: (props) => {
            if (props.event.key === "Escape") {
              popup[0]?.hide();
              return true;
            }
            return listRef?.onKeyDown(props.event) ?? false;
          },
          onExit: () => {
            popup[0]?.destroy();
            root?.unmount();
            container = null;
          },
        };
      },
    };

    return [Suggestion({ editor: this.editor, ...suggestion })];
  },
});
