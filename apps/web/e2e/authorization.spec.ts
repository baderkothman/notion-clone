import { test, expect } from "@playwright/test";
import { waitForEditorSynced } from "./helpers";

/**
 * Security-critical negative case from the top-level spec: "Unauthorized user attempts
 * to access another user's page." Two independent accounts/workspaces; user B must not
 * be able to view user A's private, unshared page by URL alone.
 */
test("a user cannot open another user's private page by guessing its URL", async ({ browser }) => {
  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  const emailA = `e2e-a-${Date.now()}@example.com`;

  await pageA.goto("/sign-up");
  await pageA.getByLabel("Name").fill("User A");
  await pageA.getByLabel("Email").fill(emailA);
  await pageA.getByLabel("Password").fill("correct-horse-battery-staple");
  await pageA.getByRole("button", { name: "Create account" }).click();
  await expect(pageA).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await pageA.getByLabel("Workspace name").fill("A's Workspace");
  await pageA.getByRole("button", { name: "Create workspace" }).click();
  await expect(pageA).toHaveURL(/\/w\//, { timeout: 15_000 });

  await pageA.getByRole("button", { name: "New" }).click();
  await pageA.getByRole("menuitem", { name: "Page" }).click();
  await expect(pageA).toHaveURL(/\/p\//, { timeout: 15_000 });
  const privatePageUrl = pageA.url();
  await pageA.getByLabel("Page title").fill("User A's Private Page");
  await pageA.locator(".prose-editor").click();
  await pageA.keyboard.type("Secret content only User A should see.");
  await waitForEditorSynced(pageA);

  await contextA.close();

  // A second, unrelated user tries to open that exact URL.
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();
  const emailB = `e2e-b-${Date.now()}@example.com`;

  await pageB.goto("/sign-up");
  await pageB.getByLabel("Name").fill("User B");
  await pageB.getByLabel("Email").fill(emailB);
  await pageB.getByLabel("Password").fill("correct-horse-battery-staple");
  await pageB.getByRole("button", { name: "Create account" }).click();
  await expect(pageB).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await pageB.getByLabel("Workspace name").fill("B's Workspace");
  await pageB.getByRole("button", { name: "Create workspace" }).click();
  await expect(pageB).toHaveURL(/\/w\//, { timeout: 15_000 });

  // User B isn't a member of A's workspace, so the workspace-scoped layout itself
  // denies access (404) before the page-level permission check ever runs — the
  // stronger of two independent guards. See permissions.spec.ts for the page-level
  // ForbiddenError UI, exercised via two members of the *same* workspace.
  await pageB.goto(privatePageUrl);
  await expect(pageB.getByText("This page could not be found")).toBeVisible({ timeout: 10_000 });
  await expect(pageB.getByText("User A's Private Page")).not.toBeVisible();
  await expect(pageB.getByText("Secret content only User A should see.")).not.toBeVisible();

  await contextB.close();
});
