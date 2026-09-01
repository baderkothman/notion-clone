import type { JSONContent } from "@notion-clone/contracts";

/** Flattens a Tiptap document to plain text for full-text indexing. Not exhaustive of
 * every possible node type, but covers every block type this app's editor produces. */
export function extractPlainText(doc: JSONContent | null | undefined): string {
  if (!doc) return "";
  const parts: string[] = [];

  function walk(node: JSONContent) {
    if (node.text) parts.push(node.text);
    for (const child of node.content ?? []) walk(child);
  }
  walk(doc);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}
