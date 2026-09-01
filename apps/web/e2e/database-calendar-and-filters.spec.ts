import { test, expect } from "@playwright/test";

/**
 * Database Calendar view (grouping rows by a Date property onto a month grid) and the
 * filter control (hiding rows that don't match a condition). Table/Board/List are
 * covered by database.spec.ts; this covers the two pieces added afterward.
 */
test("database: calendar view places a row by date; filter hides non-matching rows", async ({ page }) => {
  const email = `dbcal-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("Calendar Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await page.getByLabel("Workspace name").fill("Calendar Workspace");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/w\//, { timeout: 15_000 });

  await page.getByRole("button", { name: "New" }).first().click();
  await page.getByRole("menuitem", { name: "Database" }).click();
  await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });
  await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });

  // Add a Date property.
  await page.getByRole("button", { name: "New property" }).click();
  await page.getByPlaceholder("Property name").fill("Due");
  await page.getByRole("dialog").getByRole("button", { name: "Date" }).click();
  await expect(page.locator("th", { hasText: "Due" })).toBeVisible();

  // Add a row, title it, and set today's date.
  await page.getByRole("button", { name: "New", exact: true }).last().click();
  const titleInput = page.locator("tbody tr td input").first();
  await titleInput.fill("Ship the release");
  await titleInput.blur();

  const today = new Date().toISOString().slice(0, 10);
  const dateCell = page.locator("tbody tr").first().locator("td").nth(1).locator("input[type='date']");
  await dateCell.fill(today);
  await dateCell.blur();

  // Switch to Calendar, point it at the Due property, and confirm the row shows up on
  // today's cell.
  await page.getByRole("button", { name: "Calendar", exact: true }).first().click();
  await page.locator("select").selectOption({ label: "Due" });
  await expect(page.getByText("Ship the release")).toBeVisible({ timeout: 5_000 });

  // Filtering: "Due is empty" should hide the row we just dated.
  await page.getByRole("button", { name: "Filter" }).click();
  await page.getByRole("button", { name: "Add filter" }).click();
  await page.locator("select").filter({ hasText: "Name" }).selectOption({ label: "Due" });
  await page.getByRole("combobox").nth(2).selectOption({ label: "is empty" });
  await expect(page.getByText("Ship the release")).not.toBeVisible();
});
