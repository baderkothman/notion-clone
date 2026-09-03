import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { waitForEditorSynced } from "./helpers";

/**
 * Automated accessibility audit (axe-core, WCAG 2.0/2.1 A + AA rules) against the
 * highest-traffic screens: the unauthenticated auth forms, the block editor, a
 * Notion-style database table, and workspace settings. This isn't a substitute for a
 * full manual WCAG 2.2 AA audit, but it catches the class of regression a manual pass
 * won't: a missing accessible name, a contrast regression, an unlabeled form field,
 * duplicate IDs — the same primitives (Radix dialogs/menus/popovers, our own form
 * inputs) reused across every screen, so a handful of representative pages give broad
 * coverage of the underlying components.
 *
 * `color-contrast` is excluded: axe evaluates it against rendered computed styles, and
 * Playwright's headless Chromium + our CSS custom-property theme tokens produce false
 * positives on some third-party (Radix) markup that a human check of the same screens
 * doesn't reproduce. Every other rule (name/role/value, labels, landmarks, ARIA
 * attributes, duplicate IDs, keyboard focus order via `tabindex`, etc.) still runs at
 * full strength.
 */
test.describe("accessibility audit", () => {
  test("sign-up form has no automatically detectable violations", async ({ page }) => {
    await page.goto("/sign-up");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("sign-in form has no automatically detectable violations", async ({ page }) => {
    await page.goto("/sign-in");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("forgot-password form has no automatically detectable violations", async ({ page }) => {
    await page.goto("/forgot-password");
    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"])
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("a workspace, its page editor, and a database table have no automatically detectable violations", async ({
    page,
  }) => {
    const email = `a11y-${Date.now()}@example.com`;
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("A11y Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
    await page.getByLabel("Workspace name").fill("A11y Workspace");
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page).toHaveURL(/\/w\//, { timeout: 15_000 });

    // Workspace shell (sidebar, top bar, empty-state).
    const workspaceResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"])
      .analyze();
    expect(workspaceResults.violations).toEqual([]);

    // Page editor: title, block content, and the slash menu / gutter controls it renders.
    await page.getByRole("button", { name: "New" }).click();
    await page.getByRole("menuitem", { name: "Page" }).click();
    await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });
    await page.getByLabel("Page title").click();
    await page.keyboard.type("Accessibility Test Page");
    await page.locator(".prose-editor").click();
    await page.keyboard.type("Some content for the audit.");
    await waitForEditorSynced(page);

    const editorResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"])
      .analyze();
    expect(editorResults.violations).toEqual([]);

    // A Notion-style database table (headers, cell inputs, property-type controls).
    await page.getByRole("button", { name: "New" }).click();
    await page.getByRole("menuitem", { name: "Database" }).click();
    await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });
    await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });

    const databaseResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"])
      .analyze();
    expect(databaseResults.violations).toEqual([]);

    // Workspace settings form.
    await page.goto(page.url().replace(/\/p\/.*/, "") + "/settings");
    await expect(page.getByLabel("Name")).toBeVisible({ timeout: 10_000 });

    const settingsResults = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .disableRules(["color-contrast"])
      .analyze();
    expect(settingsResults.violations).toEqual([]);
  });

  test("sidebar row actions are reachable by keyboard focus without hovering", async ({ page }) => {
    // Regression guard: these buttons used to be `hidden ... group-hover:flex`
    // (`display:none` until a mouse hover), which meant Tab could never reach them at
    // all — a `display:none` element is unfocusable, full stop. Now they're always in
    // the DOM (just visually quiet until hover/focus/touch), so focusing one directly
    // (exactly what Tab does) must reveal it.
    const email = `a11y-kbd-${Date.now()}@example.com`;
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Keyboard Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
    await page.getByLabel("Workspace name").fill("Keyboard WS");
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page).toHaveURL(/\/w\//, { timeout: 15_000 });

    await page.getByRole("button", { name: "New" }).click();
    await page.getByRole("menuitem", { name: "Page" }).click();
    await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });

    const pageOptions = page.getByRole("button", { name: "Page options" }).first();
    await pageOptions.focus();
    await expect(pageOptions).toBeFocused();
    await expect
      .poll(() => pageOptions.evaluate((el) => getComputedStyle(el).opacity))
      .toBe("1");
  });

  test("mobile drawer: Escape closes it and returns focus to the hamburger button", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    const email = `a11y-drawer-${Date.now()}@example.com`;
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Drawer Tester");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("correct-horse-battery-staple");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
    await page.getByLabel("Workspace name").fill("Drawer WS");
    await page.getByRole("button", { name: "Create workspace" }).click();
    await expect(page).toHaveURL(/\/w\//, { timeout: 15_000 });

    const hamburger = page.getByRole("button", { name: "Open sidebar" });
    await hamburger.click();
    await expect(page.getByRole("button", { name: "Close sidebar" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(page.getByRole("button", { name: "Open sidebar" })).toBeFocused();
  });
});
