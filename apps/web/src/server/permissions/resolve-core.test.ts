import { describe, expect, it } from "vitest";
import { resolveEffectiveRole, roleAtLeast, type ChainEntry } from "./resolve-core";

function entry(overrides: Partial<ChainEntry> & { pageId: string }): ChainEntry {
  return {
    visibility: "private",
    workspaceShareRole: "edit",
    explicitRole: null,
    ...overrides,
  };
}

describe("resolveEffectiveRole", () => {
  it("grants full access to the page's creator, even if private and unshared", () => {
    const chain = [entry({ pageId: "p1" })];
    const result = resolveEffectiveRole(chain, "member", true);
    expect(result).toEqual({ role: "full", source: "owner" });
  });

  it("denies access when the requester has no workspace membership at all", () => {
    const chain = [entry({ pageId: "p1" })];
    const result = resolveEffectiveRole(chain, null, false);
    expect(result).toEqual({ role: null, source: null });
  });

  it("denies access to a private, unshared page for a non-creator member", () => {
    const chain = [entry({ pageId: "p1" })];
    const result = resolveEffectiveRole(chain, "member", false);
    expect(result).toEqual({ role: null, source: null });
  });

  it("grants the explicit share role on the page itself", () => {
    const chain = [entry({ pageId: "p1", explicitRole: "comment" })];
    const result = resolveEffectiveRole(chain, "member", false);
    expect(result).toEqual({ role: "comment", source: "explicit" });
  });

  it("inherits an explicit share from the nearest shared ancestor", () => {
    const chain = [
      entry({ pageId: "child" }),
      entry({ pageId: "parent", explicitRole: "edit" }),
      entry({ pageId: "grandparent", explicitRole: "view" }),
    ];
    const result = resolveEffectiveRole(chain, "member", false);
    expect(result).toEqual({ role: "edit", source: "inherited" });
  });

  it("grants workspace-visibility access to members but not guests", () => {
    const chain = [entry({ pageId: "p1", visibility: "workspace", workspaceShareRole: "edit" })];
    expect(resolveEffectiveRole(chain, "member", false)).toEqual({
      role: "edit",
      source: "workspace",
    });
    expect(resolveEffectiveRole(chain, "guest", false)).toEqual({ role: null, source: null });
  });

  it("prefers an explicit share on the page over inherited workspace visibility from an ancestor", () => {
    const chain = [
      entry({ pageId: "child", explicitRole: "view" }),
      entry({ pageId: "parent", visibility: "workspace", workspaceShareRole: "edit" }),
    ];
    const result = resolveEffectiveRole(chain, "member", false);
    expect(result).toEqual({ role: "view", source: "explicit" });
  });

  it("prefers the nearest ancestor's grant over a farther ancestor's stronger grant", () => {
    const chain = [
      entry({ pageId: "child" }),
      entry({ pageId: "parent", explicitRole: "view" }),
      entry({ pageId: "grandparent", explicitRole: "full" }),
    ];
    const result = resolveEffectiveRole(chain, "member", false);
    expect(result).toEqual({ role: "view", source: "inherited" });
  });
});

describe("roleAtLeast", () => {
  it("orders view < comment < edit < full", () => {
    expect(roleAtLeast("view", "view")).toBe(true);
    expect(roleAtLeast("view", "edit")).toBe(false);
    expect(roleAtLeast("full", "edit")).toBe(true);
    expect(roleAtLeast(null, "view")).toBe(false);
  });
});
