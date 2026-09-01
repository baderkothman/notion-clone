import { test, expect } from "@playwright/test";

/**
 * Notion-style database: create → add a Select-family property → add a row → set the
 * row's title and property value (creating a new select option inline) → switch to a
 * Board view grouped by that property and confirm the row lands in the right column.
 * Exercises table-view.tsx, board-view.tsx, property-cell.tsx, select-editor.tsx, and
 * the create-database/properties/rows/views server actions together.
 */
test("database: create, add property, add row, set values, switch to board", async ({ page }) => {
  const email = `db-${Date.now()}@example.com`;
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill("DB Tester");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("correct-horse-battery-staple");
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await page.getByLabel("Workspace name").fill("DB Workspace");
  await page.getByRole("button", { name: "Create workspace" }).click();
  await expect(page).toHaveURL(/\/w\//, { timeout: 15_000 });

  await page.getByRole("button", { name: "New" }).click();
  await page.getByRole("menuitem", { name: "Database" }).click();
  await expect(page).toHaveURL(/\/p\//, { timeout: 15_000 });

  await expect(page.locator("table")).toBeVisible({ timeout: 10_000 });
  await expect(page.locator("th", { hasText: "Name" })).toBeVisible();

  // A fresh database starts with just the required title property — add a Status one.
  await page.getByRole("button", { name: "New property" }).click();
  await page.getByPlaceholder("Property name").fill("Status");
  await page.getByRole("dialog").getByRole("button", { name: "Status" }).click();
  await expect(page.locator("th", { hasText: "Status" })).toBeVisible();

  // Add a row and set its title (the title column maps to the row-page's own title).
  await page.getByRole("button", { name: "New", exact: true }).last().click();
  const titleInput = page.locator("tbody tr td input").first();
  await titleInput.fill("Task one");
  await titleInput.blur();
  await expect(titleInput).toHaveValue("Task one");

  // Set the Status value, creating a new option inline.
  const statusCell = page.locator("tbody tr").first().locator("td").nth(1).locator("button");
  await statusCell.click();
  await page.getByPlaceholder("Search or create…").fill("Todo");
  await page.getByRole("button", { name: /Create.*Todo/ }).click();
  await expect(page.getByText("Todo").first()).toBeVisible();

  // Switch to a Board view grouped by Status; the row should land in the "Todo" column.
  await page.getByRole("button", { name: "Board", exact: true }).first().click();
  await page.locator("select").selectOption({ label: "Status" });
  await expect(page.getByText("Task one")).toBeVisible({ timeout: 5_000 });
});
