import type { Editor, Range } from "@tiptap/core";

export interface SlashMenuItem {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  keywords: string[];
  command: (editor: Editor, range: Range) => void;
}

export const slashMenuItems: SlashMenuItem[] = [
  {
    key: "text",
    title: "Text",
    subtitle: "Plain paragraph",
    icon: "T",
    keywords: ["paragraph", "text"],
    command: (editor, range) => editor.chain().focus().deleteRange(range).setParagraph().run(),
  },
  {
    key: "heading1",
    title: "Heading 1",
    subtitle: "Big section heading",
    icon: "H1",
    keywords: ["h1", "heading", "title"],
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 1 }).run(),
  },
  {
    key: "heading2",
    title: "Heading 2",
    subtitle: "Medium section heading",
    icon: "H2",
    keywords: ["h2", "heading", "subtitle"],
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 2 }).run(),
  },
  {
    key: "heading3",
    title: "Heading 3",
    subtitle: "Small section heading",
    icon: "H3",
    keywords: ["h3", "heading"],
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).setNode("heading", { level: 3 }).run(),
  },
  {
    key: "bulletList",
    title: "Bulleted list",
    subtitle: "A simple bulleted list",
    icon: "•",
    keywords: ["bullet", "list", "ul"],
    command: (editor, range) => editor.chain().focus().deleteRange(range).toggleBulletList().run(),
  },
  {
    key: "orderedList",
    title: "Numbered list",
    subtitle: "A list with numbering",
    icon: "1.",
    keywords: ["numbered", "list", "ol"],
    command: (editor, range) => editor.chain().focus().deleteRange(range).toggleOrderedList().run(),
  },
  {
    key: "taskList",
    title: "To-do list",
    subtitle: "Track tasks with checkboxes",
    icon: "☑",
    keywords: ["todo", "task", "checkbox"],
    command: (editor, range) => editor.chain().focus().deleteRange(range).toggleTaskList().run(),
  },
  {
    key: "toggle",
    title: "Toggle list",
    subtitle: "Collapsible content",
    icon: "▸",
    keywords: ["toggle", "collapse", "dropdown"],
    command: (editor, range) => editor.chain().focus().deleteRange(range).setToggle().run(),
  },
  {
    key: "quote",
    title: "Quote",
    subtitle: "Capture a quotation",
    icon: "❝",
    keywords: ["quote", "blockquote"],
    command: (editor, range) => editor.chain().focus().deleteRange(range).toggleBlockquote().run(),
  },
  {
    key: "callout",
    title: "Callout",
    subtitle: "Make writing stand out",
    icon: "💡",
    keywords: ["callout", "note", "highlight"],
    command: (editor, range) => editor.chain().focus().deleteRange(range).setCallout().run(),
  },
  {
    key: "divider",
    title: "Divider",
    subtitle: "Visually divide blocks",
    icon: "—",
    keywords: ["divider", "separator", "hr"],
    command: (editor, range) => editor.chain().focus().deleteRange(range).setHorizontalRule().run(),
  },
  {
    key: "codeBlock",
    title: "Code",
    subtitle: "Code block with monospace font",
    icon: "</>",
    keywords: ["code", "codeblock"],
    command: (editor, range) => editor.chain().focus().deleteRange(range).toggleCodeBlock().run(),
  },
  {
    key: "table",
    title: "Table",
    subtitle: "Simple table",
    icon: "▦",
    keywords: ["table", "grid"],
    command: (editor, range) =>
      editor.chain().focus().deleteRange(range).insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(),
  },
  {
    key: "image",
    title: "Image",
    subtitle: "Upload an image",
    icon: "🖼",
    keywords: ["image", "picture", "photo", "upload"],
    command: (editor, range) => editor.chain().focus().deleteRange(range).insertImagePlaceholder().run(),
  },
  {
    key: "file",
    title: "File",
    subtitle: "Attach a file",
    icon: "📎",
    keywords: ["file", "attachment", "upload"],
    command: (editor, range) => editor.chain().focus().deleteRange(range).insertFilePlaceholder().run(),
  },
  {
    key: "bookmark",
    title: "Bookmark",
    subtitle: "Embed a link with a preview",
    icon: "🔖",
    keywords: ["bookmark", "link", "embed", "url"],
    command: (editor, range) => editor.chain().focus().deleteRange(range).insertBookmarkPlaceholder().run(),
  },
];
