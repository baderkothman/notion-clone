import { test, expect } from "@playwright/test";
import { waitForContentPersisted } from "./helpers";

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

    await page.getByRole("button", { name: "New" }).click();
    await page.getByRole("menuitem", { name: "Page" }).click();
    await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });

    const title = page.getByLabel("Page title");
    await title.click();
    await title.fill("My First Page");

    const editor = page.locator(".prose-editor");
    await editor.click();
    await page.keyboard.type("Hello from Playwright.");

    // Content must be durably captured before the reload-and-check below — via plain
    // autosave ("Saved") or realtime collaboration ("Live"), depending on whether
    // apps/realtime is configured in this environment (see helpers.ts).
    await waitForContentPersisted(page);

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
    // `/` itself is now the public marketing landing page (see middleware.ts's
    // PUBLIC_PATHS and app/page.tsx) — an unauthenticated visitor is meant to see it,
    // not get redirected. `/onboarding` is a real protected route (requireUserId()
    // in its page component, not in PUBLIC_PATHS) and is exactly the kind of URL this
    // test exists to guard: a signed-out visitor who lands on any protected page
    // still gets sent to sign-in first.
    await page.goto("/onboarding");
    await expect(page).toHaveURL(/\/sign-in/);
  });

  test("the public landing page is visible to signed-out visitors", async ({ page }) => {
    await page.goto("/");
    await expect(page).toHaveURL("/");
    await expect(page.getByRole("heading", { name: /your workspace/i })).toBeVisible();
  });

  test("a failed sign-in does not clear the form", async ({ page }) => {
    // Regression test: these forms used to be uncontrolled `<form action={...}>`
    // elements, and React/the browser reset uncontrolled fields after a
    // `useActionState` action completes — even without a redirect — wiping
    // everything the user had typed on every failed attempt. Fields are now
    // controlled (see sign-in-form.tsx) specifically so this doesn't happen.
    const email = `persist-${Date.now()}@example.com`;
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("wrong-password-here");
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByText("Incorrect email or password.")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByLabel("Email")).toHaveValue(email);
    await expect(page.getByLabel("Password")).toHaveValue("wrong-password-here");
  });
});
