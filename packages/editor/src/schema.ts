import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import Highlight from "@tiptap/extension-highlight";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Table from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
import type { AnyExtension } from "@tiptap/core";

import { BlockId } from "./extensions/block-id";
import { ToggleSchema } from "./nodes/toggle-schema";
import { CalloutSchema } from "./nodes/callout-schema";
import { ChildPageSchema } from "./nodes/child-page-schema";
import { ImageBlockSchema } from "./nodes/image-block-schema";
import { FileBlockSchema } from "./nodes/file-block-schema";
import { BookmarkSchema } from "./nodes/bookmark-schema";

export { EMPTY_TIPTAP_DOC } from "./empty-doc";

/**
 * The document schema, with no React/DOM-only code anywhere in the import graph —
 * every custom node here is the plain `*-schema.ts` half also used (via `.extend()`) by
 * the real browser editor in `kit.ts`. This is what apps/realtime's Hocuspocus server
 * imports to losslessly convert between Tiptap JSON and Yjs updates
 * (`@hocuspocus/transformer`'s `TiptapTransformer.toYdoc`/`fromYdoc` need the schema —
 * not the editing UI — to know each custom node's attrs). Import this via
 * `@notion-clone/editor/schema`, never the package's main entry point, from any process
 * that isn't bundled for the browser (no `react`/`react-dom` in apps/realtime's
 * dependencies at all).
 *
 * Node/mark identity (name, attrs, parseHTML/renderHTML) must exactly match `kit.ts`'s
 * `createExtensions()` — this is deliberately not the *same* extension objects (a
 * plain Node.create() here vs. `.extend({ addNodeView })` there) but must stay in sync
 * with it structurally. `SlashCommand` and `Placeholder` are omitted: both are
 * editing-UI concerns (decorations/input rules) with no schema (node/mark) footprint,
 * so they don't affect Yjs<->JSON conversion.
 */
export function createSchemaExtensions(): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
    }),
    Underline,
    Link.configure({ openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer nofollow" } }),
    Highlight.configure({ multicolor: true }),
    TextStyle,
    Color,
    TaskList,
    TaskItem.configure({ nested: true }),
    Table.configure({ resizable: true }),
    TableRow,
    TableHeader,
    TableCell,
    BlockId,
    ToggleSchema,
    CalloutSchema,
    ChildPageSchema,
    ImageBlockSchema,
    FileBlockSchema,
    BookmarkSchema,
  ];
}
