import { test, expect } from "@playwright/test";

/**
 * Workspace settings: rename (with URL/slug change and redirect), and the members
 * page's invite → pending → revoke lifecycle. The full cross-account accept flow (an
 * invited person signing up and joining) is verified manually each session rather than
 * as a permanent test here, since it depends on reading the invite token from the dev
 * server's console log — a stand-in for real email delivery (see
 * server/workspaces/members.ts), not something a CI runner can portably do.
 */
test.describe("workspace settings", () => {
  test("rename the workspace and change its URL", async ({ page }) => {
    const email = `settings-${Date.now()}@example.com`;
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Settings Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
    await page.getByLabel("Workspace name").fill("Original Name");
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page).toHaveURL(/\/w\/original-name-/, { timeout: 15_000 });

    const newSlug = `renamed-workspace-e2e-${Date.now()}`;
    await page.goto(page.url() + "/settings");
    await page.getByLabel("Name").fill("Renamed Workspace");
    await page.getByLabel("URL").fill(newSlug);
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(page).toHaveURL(new RegExp(`/w/${newSlug}/settings`), { timeout: 10_000 });
    await expect(page.getByText("Workspace updated")).toBeVisible();

    // The rename should be visible everywhere it's shown, not just the form field.
    await expect(page.getByRole("button", { name: /Renamed Workspace/ })).toBeVisible();
  });

  test("inviting a member shows a pending invitation, which can be revoked", async ({ page }) => {
    const email = `settings-${Date.now()}@example.com`;
    const memberEmail = `invitee-${Date.now()}@example.com`;

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Settings Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
    await page.getByLabel("Workspace name").fill("Invite Test Workspace");
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page).toHaveURL(/\/w\//, { timeout: 15_000 });

    await page.goto(page.url() + "/settings/members");

    await page.getByPlaceholder("Invite by email…").fill(memberEmail);
    await page.getByRole("button", { name: "Invite", exact: true }).click();
    await expect(page.getByText(`Invitation sent to ${memberEmail}`)).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(memberEmail, { exact: true })).toBeVisible();
    await expect(page.getByText("Pending invitations")).toBeVisible();

    await page.getByRole("button", { name: "Revoke" }).click();
    await expect(page.getByText("Pending invitations")).not.toBeVisible();
  });
});
