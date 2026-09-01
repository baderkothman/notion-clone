import { test, expect } from "@playwright/test";

/**
 * Comments: add a top-level comment, reply to it (threading), resolve/reopen, delete.
 * Exercises comments-panel.tsx's `repliesByParent` grouping and the
 * create/resolve/delete comment server actions together.
 */
test("comments: create, reply (threading), resolve, delete", async ({ page }) => {
  const email = `comments-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Comments Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await page.getByLabel("Workspace name").fill("Comments Workspace");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/w\//, { timeout: 15_000 });

  await page.getByRole("button", { name: "New" }).first().click();
  await page.getByRole("menuitem", { name: "Page" }).click();
  await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });

  await page.getByRole("button", { name: "Comments", exact: true }).click();
  await expect(page.getByText("No comments yet")).toBeVisible();

  await page.getByPlaceholder("Add a comment…").fill("This needs a second look.");
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("This needs a second look.")).toBeVisible({ timeout: 10_000 });

  // Reply — threading.
  await page.getByRole("button", { name: "Reply" }).click();
  const replyForm = page.locator("form").filter({ has: page.getByPlaceholder("Reply…") });
  await replyForm.getByPlaceholder("Reply…").fill("Agreed, looking into it.");
  await replyForm.getByRole("button", { name: "Send" }).click();
  await expect(page.getByText("Agreed, looking into it.")).toBeVisible({ timeout: 10_000 });

  // Resolve hides the thread by default; "Show resolved" brings it back.
  await page.getByRole("button", { name: "Resolve", exact: true }).click();
  await expect(page.getByText("This needs a second look.")).not.toBeVisible();
  await page.getByRole("button", { name: "Show resolved" }).click();
  await expect(page.getByText("This needs a second look.")).toBeVisible();
  await expect(page.getByText("Agreed, looking into it.")).toBeVisible();

  // Reopen, then delete the reply — the parent comment should remain.
  await page.getByRole("button", { name: "Reopen" }).click();
  await page.getByRole("button", { name: "Delete" }).last().click();
  await expect(page.getByText("Agreed, looking into it.")).not.toBeVisible();
  await expect(page.getByText("This needs a second look.")).toBeVisible();
});
