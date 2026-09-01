import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
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
import Collaboration from "@tiptap/extension-collaboration";
import CollaborationCursor from "@tiptap/extension-collaboration-cursor";
import type { AnyExtension } from "@tiptap/core";
import type * as Y from "yjs";

import { BlockId } from "./extensions/block-id";
import { Toggle } from "./nodes/toggle";
import { Callout } from "./nodes/callout";
import { ChildPage } from "./nodes/child-page";
import { ImageBlock } from "./nodes/image-block";
import { FileBlock } from "./nodes/file-block";
import { Bookmark } from "./nodes/bookmark";
import { SlashCommand } from "./slash-menu/slash-command";
import type { EditorFileService, EditorEmbedService } from "./types";

export interface CollaborationConfig {
  /** The Yjs doc synced with apps/realtime — its "default" fragment is the single
   * source of truth for content in this mode, so `content` is not also passed to
   * `useEditor` (see block-editor.tsx). */
  document: Y.Doc;
  /** Present once the Hocuspocus connection is established; omitted (no cursor
   * extension) while still connecting so there's nothing to render cursors on yet. */
  provider?: import("@hocuspocus/provider").HocuspocusProvider;
  user: { name: string; color: string };
}

export interface CreateExtensionsOptions {
  placeholder?: string;
  onNavigateToPage: (pageId: string) => void;
  onCreateChildPage?: () => Promise<{ id: string; title: string; icon: string | null } | null>;
  fileService: EditorFileService | null;
  embedService: EditorEmbedService | null;
  /** When set, the editor syncs its content through Yjs instead of the plain
   * document/history model — see use-collaboration.ts. */
  collaboration?: CollaborationConfig;
}

export function createExtensions(options: CreateExtensionsOptions): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // The Collaboration extension brings its own Yjs-backed undo/redo (yUndoPlugin);
      // running StarterKit's plain history alongside it would double-track changes and
      // desync the two undo stacks, so it's disabled exactly when collaboration is on.
      history: options.collaboration ? false : {},
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
    Placeholder.configure({
      placeholder: ({ node }) => {
        if (node.type.name === "heading") return "Heading";
        return options.placeholder ?? "Type '/' for commands";
      },
      includeChildren: false,
    }),
    BlockId,
    Toggle,
    Callout,
    ChildPage.configure({ onNavigate: options.onNavigateToPage }),
    ImageBlock.configure({ fileService: options.fileService }),
    FileBlock.configure({ fileService: options.fileService }),
    Bookmark.configure({ embedService: options.embedService }),
    SlashCommand.configure({ onCreateChildPage: options.onCreateChildPage }),
    ...(options.collaboration
      ? [
          Collaboration.configure({ document: options.collaboration.document }),
          ...(options.collaboration.provider
            ? [
                CollaborationCursor.configure({
                  provider: options.collaboration.provider,
                  user: options.collaboration.user,
                }),
              ]
            : []),
        ]
      : []),
  ];
}
