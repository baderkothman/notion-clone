import { describe, expect, it } from "vitest";
import { SHARE_ROLE_RANK, sharePageSchema } from "./permissions";

describe("SHARE_ROLE_RANK", () => {
  it("orders roles weakest to strongest: view < comment < edit < full", () => {
    expect(SHARE_ROLE_RANK.view).toBeLessThan(SHARE_ROLE_RANK.comment);
    expect(SHARE_ROLE_RANK.comment).toBeLessThan(SHARE_ROLE_RANK.edit);
    expect(SHARE_ROLE_RANK.edit).toBeLessThan(SHARE_ROLE_RANK.full);
  });
});

describe("sharePageSchema", () => {
  it("never allows granting 'full' through a share invite (full is owner-only)", () => {
    const result = sharePageSchema.safeParse({
      pageId: "123e4567-e89b-12d3-a456-426614174000",
      email: "a@b.com",
      role: "full",
    });
    expect(result.success).toBe(false);
  });

  it("accepts view/comment/edit roles", () => {
    for (const role of ["view", "comment", "edit"] as const) {
      const result = sharePageSchema.safeParse({
        pageId: "123e4567-e89b-12d3-a456-426614174000",
        email: "a@b.com",
        role,
      });
      expect(result.success).toBe(true);
    }
  });

  it("rejects a non-uuid pageId", () => {
    const result = sharePageSchema.safeParse({ pageId: "not-a-uuid", email: "a@b.com", role: "view" });
    expect(result.success).toBe(false);
  });
});
