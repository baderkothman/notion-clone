import { test, expect } from "@playwright/test";

/**
 * Publicly sharing a database: an anonymous visitor sees a clean read-only table of its
 * rows and property values — no interactive-looking inputs that would silently no-op
 * for someone with no session (see public-database-view.tsx's doc comment for why this
 * is its own renderer, not the interactive TableView in disabled dress).
 */
test("a publicly shared database is viewable read-only by an anonymous visitor", async ({ browser }) => {
  const ownerContext = await browser.newContext();
  await ownerContext.grantPermissions(["clipboard-read", "clipboard-write"]);
  const owner = await ownerContext.newPage();
  const email = `dbshare-${Date.now()}@example.com`;

  await owner.goto("/sign-up");
  await owner.getByLabel("Name").fill("DB Share Tester");
  await owner.getByLabel("Email").fill(email);
  await owner.getByLabel("Password").fill("correct-horse-battery-staple");
  await owner.getByRole("button", { name: "Create account" }).click();
  await expect(owner).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await owner.getByLabel("Workspace name").fill("DB Share Workspace");
  await owner.getByRole("button", { name: "Create workspace" }).click();
  await expect(owner).toHaveURL(/\/w\//, { timeout: 15_000 });

  await owner.getByRole("button", { name: "New" }).first().click();
  await owner.getByRole("menuitem", { name: "Database" }).click();
  await expect(owner).toHaveURL(/\/p\//, { timeout: 15_000 });
  await expect(owner.locator("table")).toBeVisible({ timeout: 10_000 });

  await owner.getByRole("button", { name: "New", exact: true }).last().click();
  const titleInput = owner.locator("tbody tr td input").first();
  await titleInput.fill("Public row");
  await titleInput.blur();

  await owner.getByRole("button", { name: "Share", exact: true }).click();
  await owner.getByText("Share to web").locator("..").getByRole("checkbox").check();
  await owner.getByRole("button", { name: "Copy public link" }).click();
  const publicUrl = await owner.evaluate(() => navigator.clipboard.readText());
  expect(publicUrl).toMatch(/\/share\//);

  const anonContext = await browser.newContext();
  const anon = await anonContext.newPage();
  await anon.goto(publicUrl);

  await expect(anon.getByRole("cell", { name: "Public row" })).toBeVisible({ timeout: 10_000 });
  // Read-only: no "New" row/property affordances for an anonymous visitor.
  await expect(anon.getByRole("button", { name: "New property" })).toHaveCount(0);
  await expect(anon.getByRole("navigation", { name: "Sidebar" })).toHaveCount(0);

  await ownerContext.close();
  await anonContext.close();
});
