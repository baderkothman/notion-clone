import { test, expect } from "@playwright/test";

/**
 * The primary happy-path flow from the top-level spec's E2E list: sign up → create
 * workspace → create page → write content → autosave → sign out → sign back in → the
 * page and its content persisted. Each `test()` below is independent (its own account)
 * so failures don't cascade.
 */
test.describe("core flow", () => {
  test("sign up, create workspace, create and edit a page, autosave persists", async ({ page }) => {
    const email = `e2e-${Date.now()}@example.com`;

    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("E2E Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
    await page.getByLabel("Workspace name").fill("Acme Inc");
    await page.getByRole("button", { name: "Create workspace" }).click();

    await expect(page).toHaveURL(/\/w\/acme-inc-/, { timeout: 15_000 });
    await expect(page.getByText("Welcome to Acme Inc")).toBeVisible();

    await page.getByRole("button", { name: "New page" }).click();
    await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });

    const title = page.getByLabel("Page title");
    await title.click();
    await title.fill("My First Page");

    const editor = page.locator(".prose-editor");
    await editor.click();
    await page.keyboard.type("Hello from Playwright.");

    // Autosave should eventually report "Saved".
    await expect(page.getByText("Saved")).toBeVisible({ timeout: 10_000 });

    const pageUrl = page.url();

    // Sign out, then sign back in and confirm the page + content survived.
    await page.getByRole("button", { name: /E2E Tester|e2e-/ }).click();
    await page.getByRole("menuitem", { name: "Sign out" }).click();
    await expect(page).toHaveURL(/\/sign-in/, { timeout: 15_000 });

    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "Sign in" }).click();
    await expect(page).toHaveURL(/\/w\//, { timeout: 15_000 });

    await page.goto(pageUrl);
    await expect(page.getByLabel("Page title")).toHaveValue("My First Page");
    await expect(page.locator(".prose-editor")).toContainText("Hello from Playwright.");
  });

  test("unauthenticated visitors are redirected to sign-in", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
