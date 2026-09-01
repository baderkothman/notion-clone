/**
 * Tiptap/ProseMirror JSON document shape. Kept structural (not imported from
 * @tiptap/core) so packages/database and packages/contracts don't need the editor as a
 * dependency — only apps/web's editor integration does.
 */
export interface JSONContent {
  type?: string;
  attrs?: Record<string, unknown>;
  content?: JSONContent[];
  marks?: { type: string; attrs?: Record<string, unknown> }[];
  text?: string;
  [key: string]: unknown;
}

export const EMPTY_DOCUMENT: JSONContent = {
  type: "doc",
  content: [{ type: "paragraph" }],
};
