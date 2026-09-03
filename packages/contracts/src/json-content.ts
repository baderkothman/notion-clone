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

/** Keys that let a plain object reach or overwrite `Object.prototype` when something
 * later spreads/merges it unsafely — Tiptap's own `mergeAttributes()` has exactly this
 * bug for a node/mark's `attrs` (see GHSA-cp6q-959q-f8rh; @tiptap/core's fix requires a
 * major-version upgrade this codebase isn't taking on to close this one issue). Content
 * saved via `saveDocumentSchema` below is later fed to `@hocuspocus/transformer`'s
 * `toYdoc()` on the realtime server, so an attacker doesn't need the editor UI at all —
 * a hand-crafted save request with a poisoned `attrs` key would do it. Rejecting these
 * keys anywhere in the document at the validation boundary closes that path without
 * touching Tiptap internals. */
const DANGEROUS_KEYS = new Set(["__proto__", "constructor", "prototype"]);

export function hasDangerousKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(hasDangerousKey);
  if (typeof value !== "object" || value === null) return false;
  for (const key of Object.keys(value)) {
    if (DANGEROUS_KEYS.has(key)) return true;
    if (hasDangerousKey((value as Record<string, unknown>)[key])) return true;
  }
  return false;
}
