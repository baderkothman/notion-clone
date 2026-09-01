import { test, expect } from "@playwright/test";

/**
 * Two related editor-integration features: commenting on a specific block (via the
 * hover gutter's comment icon) and @mention autocomplete in the comment composer.
 * Exercises drag-handle.tsx's comment button, comment-indicators.tsx's margin badge,
 * and mention-composer.tsx's autocomplete + mention-id recording together.
 */
test("block-scoped comments and @mention autocomplete", async ({ page }) => {
  const email = `blockcomment-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Block Commenter");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await page.getByLabel("Workspace name").fill("Block Comments Workspace");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/w\//, { timeout: 15_000 });

  await page.getByRole("button", { name: "New" }).first().click();
  await page.getByRole("menuitem", { name: "Page" }).click();
  await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });

  const editor = page.locator(".prose-editor");
  await editor.click();
  await page.keyboard.type("A block worth discussing.");

  // Hover the block to reveal the gutter, then click its comment icon.
  const block = page.locator("[data-block-id]").first();
  await block.hover();
  await page.getByRole("button", { name: "Comment on this block" }).click();

  await expect(page.getByText("Commenting on selected block")).toBeVisible();

  // @mention autocomplete: typing "@" filters to the current user (only member so far).
  const composer = page.getByPlaceholder("Add a comment…");
  const composerForm = page.locator("form").filter({ has: composer });
  await composer.fill("Hey @Block");
  const mentionOption = composerForm.getByText("Block Commenter", { exact: true });
  await expect(mentionOption).toBeVisible({ timeout: 5_000 });
  await mentionOption.click();
  await expect(composer).toHaveValue(/Hey @Block Commenter /);

  await composer.press("Enter");
  await expect(page.getByText(/Hey @Block Commenter/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText("On a block")).toBeVisible();

  // The block now shows a persistent comment-thread badge in the editor margin, even
  // without hovering.
  await page.mouse.move(0, 0);
  await expect(page.getByRole("button", { name: "View comment thread on this block" })).toBeVisible();
});
