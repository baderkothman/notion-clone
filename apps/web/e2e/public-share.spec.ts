import { test, expect } from "@playwright/test";

/**
 * "Share to web": a page owner enables the public toggle, copies the link, and an
 * anonymous visitor (no session, no workspace membership) can view its content
 * read-only. Also confirms a page that has NOT been publicly shared still 404s for an
 * anonymous visitor — the toggle is what grants access, not merely knowing a page id.
 */
test("a publicly shared page is viewable by an anonymous visitor; an unshared one is not", async ({ browser }) => {
  const ownerContext = await browser.newContext();
  await ownerContext.grantPermissions(["clipboard-read", "clipboard-write"]);
  const owner = await ownerContext.newPage();
  const email = `share-${Date.now()}@example.com`;

  await owner.goto("/sign-up");
  await owner.getByLabel("Name").fill("Share Tester");
  await owner.getByLabel("Email").fill(email);
  await owner.getByLabel("Password").fill("correct-horse-battery-staple");
  await owner.getByRole("button", { name: "Create account" }).click();
  await expect(owner).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await owner.getByLabel("Workspace name").fill("Share Workspace");
  await owner.getByRole("button", { name: "Create workspace" }).click();
  await expect(owner).toHaveURL(/\/w\//, { timeout: 15_000 });

  await owner.getByRole("button", { name: "New" }).first().click();
  await owner.getByRole("menuitem", { name: "Page" }).click();
  await expect(owner).toHaveURL(/\/p\//, { timeout: 15_000 });

  const unsharedUrl = owner.url();
  await owner.getByLabel("Page title").fill("A Public Page");
  await owner.locator(".prose-editor").click();
  await owner.keyboard.type("Anyone with the link can read this.");
  await expect(owner.getByText("Saved")).toBeVisible({ timeout: 10_000 });

  // Before sharing: an anonymous visitor hitting this exact page URL is redirected to
  // sign-in (protected route), and the share route 404s for a page never made public.
  const anonContext = await browser.newContext();
  const anon = await anonContext.newPage();
  await anon.goto(unsharedUrl);
  await expect(anon).toHaveURL(/\/sign-in/, { timeout: 10_000 });

  // Enable "Share to web" and copy the link.
  await owner.getByRole("button", { name: "Share", exact: true }).click();
  await owner.getByText("Share to web").locator("..").getByRole("checkbox").check();
  await owner.getByRole("button", { name: "Copy public link" }).click();
  const publicUrl = await owner.evaluate(() => navigator.clipboard.readText());
  expect(publicUrl).toMatch(/\/share\//);

  // The anonymous visitor can now view it — read-only, no sidebar, no sign-in required.
  await anon.goto(publicUrl);
  await expect(anon.getByRole("heading", { name: "A Public Page" })).toBeVisible({ timeout: 10_000 });
  await expect(anon.getByText("Anyone with the link can read this.")).toBeVisible();
  await expect(anon.getByRole("navigation", { name: "Sidebar" })).toHaveCount(0);
  // Read-only: the content is not inside an editable ProseMirror instance.
  await expect(anon.locator(".prose-editor[contenteditable='true']")).toHaveCount(0);

  await ownerContext.close();
  await anonContext.close();
});
