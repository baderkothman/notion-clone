import { Extension } from "@tiptap/core";
import { Plugin, PluginKey, type Transaction } from "@tiptap/pm/state";

/**
 * Assigns a stable `id` attribute to every direct child of the document (each
 * "top-level block" in Notion's sense) the first time it's created, and never changes it
 * afterward. This id is what drag handles, the block-level "+"/"⋮⋮" gutter, and
 * block-scoped comments (`comments.blockId`) address — content edits inside a block
 * never touch its id, only splitting/duplicating a block produces a new one.
 */
export const BlockId = Extension.create({
  name: "blockId",

  addGlobalAttributes() {
    return [
      {
        types: [
          "paragraph",
          "heading",
          "bulletList",
          "orderedList",
          "taskList",
          "blockquote",
          "codeBlock",
          "horizontalRule",
          "table",
          "toggle",
          "callout",
          "childPage",
          "imageBlock",
          "fileBlock",
          "bookmark",
        ],
        attributes: {
          blockId: {
            default: null,
            parseHTML: (element) => element.getAttribute("data-block-id"),
            renderHTML: (attributes) =>
              attributes.blockId ? { "data-block-id": attributes.blockId } : {},
          },
        },
      },
    ];
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("blockId"),
        appendTransaction: (transactions: readonly Transaction[], _oldState, newState) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;

          let tr = newState.tr;
          let changed = false;

          newState.doc.forEach((node, offset) => {
            if (!node.isBlock) return;
            if (!node.attrs || "blockId" in node.attrs === false) return;
            if (node.attrs.blockId) return;

            tr = tr.setNodeMarkup(offset, undefined, {
              ...node.attrs,
              blockId: crypto.randomUUID(),
            });
            changed = true;
          });

          return changed ? tr : null;
        },
      }),
    ];
  },
});
