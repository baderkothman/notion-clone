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
import type { AnyExtension } from "@tiptap/core";

import { BlockId } from "./extensions/block-id";
import { Toggle } from "./nodes/toggle";
import { Callout } from "./nodes/callout";
import { ChildPage } from "./nodes/child-page";
import { ImageBlock } from "./nodes/image-block";
import { FileBlock } from "./nodes/file-block";
import { Bookmark } from "./nodes/bookmark";
import { SlashCommand } from "./slash-menu/slash-command";
import type { EditorFileService, EditorEmbedService } from "./types";

export interface CreateExtensionsOptions {
  placeholder?: string;
  onNavigateToPage: (pageId: string) => void;
  onCreateChildPage?: () => Promise<{ id: string; title: string; icon: string | null } | null>;
  fileService: EditorFileService | null;
  embedService: EditorEmbedService | null;
}

export function createExtensions(options: CreateExtensionsOptions): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [1, 2, 3] },
      // Collaboration extensions bring their own history; disabled here and enabled by
      // the caller only when a Yjs doc is attached (see components/page/editor.tsx).
      history: {},
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
  ];
}
