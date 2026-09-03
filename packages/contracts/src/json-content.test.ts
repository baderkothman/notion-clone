import { describe, expect, it } from "vitest";
import { hasDangerousKey, EMPTY_DOCUMENT } from "./json-content";
import { saveDocumentSchema } from "./pages";

describe("hasDangerousKey", () => {
  it("accepts ordinary Tiptap document content", () => {
    expect(hasDangerousKey(EMPTY_DOCUMENT)).toBe(false);
    expect(
      hasDangerousKey({
        type: "doc",
        content: [{ type: "paragraph", attrs: { textAlign: "left" }, content: [{ type: "text", text: "hi" }] }],
      }),
    ).toBe(false);
  });

  // `JSON.parse` (not an object literal): writing `{ __proto__: {...} }` as source code
  // invokes the special `__proto__` *setter* and sets the object's actual prototype
  // rather than creating an own enumerable property — the opposite of what an attacker's
  // JSON request body does. `JSON.parse` builds plain data properties instead, which is
  // both what a real payload looks like on the wire and what Tiptap's `mergeAttributes()`
  // bug actually mishandles, so it's the only way to construct a faithful test case here.
  it("catches a poisoned __proto__ key at any depth, including inside attrs/marks", () => {
    expect(hasDangerousKey(JSON.parse('{"__proto__": {"polluted": true}}'))).toBe(true);
    expect(
      hasDangerousKey(JSON.parse('{"type": "paragraph", "attrs": {"__proto__": {"polluted": true}}}')),
    ).toBe(true);
    expect(
      hasDangerousKey(
        JSON.parse(
          '{"type": "doc", "content": [{"type": "text", "text": "hi", "marks": [{"type": "bold", "attrs": {"__proto__": {}}}]}]}',
        ),
      ),
    ).toBe(true);
  });

  it("also rejects 'constructor' and 'prototype' keys", () => {
    expect(hasDangerousKey(JSON.parse('{"attrs": {"constructor": {}}}'))).toBe(true);
    expect(hasDangerousKey(JSON.parse('{"attrs": {"prototype": {}}}'))).toBe(true);
  });

  it("does not flag arrays or primitives", () => {
    expect(hasDangerousKey([1, 2, 3])).toBe(false);
    expect(hasDangerousKey("proto")).toBe(false);
    expect(hasDangerousKey(null)).toBe(false);
  });
});

describe("saveDocumentSchema", () => {
  const base = { pageId: "123e4567-e89b-12d3-a456-426614174000", expectedVersion: 1 };

  it("accepts ordinary content", () => {
    const result = saveDocumentSchema.safeParse({ ...base, content: EMPTY_DOCUMENT });
    expect(result.success).toBe(true);
  });

  it("rejects content carrying a poisoned attrs key (GHSA-cp6q-959q-f8rh)", () => {
    const result = saveDocumentSchema.safeParse({
      ...base,
      content: JSON.parse(
        '{"type": "doc", "content": [{"type": "paragraph", "attrs": {"__proto__": {"polluted": true}}}]}',
      ),
    });
    expect(result.success).toBe(false);
  });
});
