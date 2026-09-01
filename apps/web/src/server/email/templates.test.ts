import { describe, expect, it } from "vitest";
import { workspaceInviteEmail, passwordResetEmail } from "./templates";

describe("workspaceInviteEmail", () => {
  it("includes the workspace name and invite URL in both html and text", () => {
    const result = workspaceInviteEmail({
      workspaceName: "Acme Inc",
      inviteUrl: "https://example.com/invite/abc123",
    });
    expect(result.subject).toContain("Acme Inc");
    expect(result.html).toContain("Acme Inc");
    expect(result.html).toContain("https://example.com/invite/abc123");
    expect(result.text).toContain("https://example.com/invite/abc123");
  });
});

describe("passwordResetEmail", () => {
  it("includes the reset URL in both html and text", () => {
    const result = passwordResetEmail({ resetUrl: "https://example.com/reset-password?token=xyz" });
    expect(result.html).toContain("https://example.com/reset-password?token=xyz");
    expect(result.text).toContain("https://example.com/reset-password?token=xyz");
    expect(result.subject).toBe("Reset your password");
  });
});
