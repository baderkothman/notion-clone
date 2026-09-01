import { test, expect } from "@playwright/test";

/**
 * Real-time collaboration end to end: two independent accounts, sharing a page for
 * "edit" access, both connect to apps/realtime's Hocuspocus room for the same page and
 * see each other's typing live — not merely "after autosave" but immediately, since
 * Yjs updates broadcast directly through the room rather than round-tripping through
 * the plain autosave server action (see use-collaboration.ts, kit.ts's Collaboration
 * extension wiring, and page-view.tsx's `collabOwnsSaving`).
 *
 * Requires apps/realtime running (`pnpm --filter realtime dev`) alongside the web app
 * and Postgres — see docs/TESTING.md. If apps/realtime isn't running, both sides stay on
 * "Connecting…" and this test times out, rather than silently passing.
 */
test("two collaborators editing the same page see each other's changes live", async ({ browser }) => {
  const emailA = `realtime-a-${Date.now()}@example.com`;
  const emailB = `realtime-b-${Date.now()}@example.com`;

  const contextA = await browser.newContext();
  const pageA = await contextA.newPage();
  const contextB = await browser.newContext();
  const pageB = await contextB.newPage();

  // User B signs up first — sharePageAction looks up the invitee by an existing
  // account's email, so B must exist before A can share the page with them.
  await pageB.goto("/sign-up");
  await pageB.getByLabel("Name").fill("Realtime B");
  await pageB.getByLabel("Email").fill(emailB);
  await pageB.getByLabel("Password").fill("correct-horse-battery-staple");
  await pageB.getByRole("button", { name: "Create account" }).click();
  await expect(pageB).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await pageB.getByLabel("Workspace name").fill("B's Workspace");
  await pageB.getByRole("button", { name: "Create workspace" }).click();
  await expect(pageB).toHaveURL(/\/w\//, { timeout: 15_000 });

  await pageA.goto("/sign-up");
  await pageA.getByLabel("Name").fill("Realtime A");
  await pageA.getByLabel("Email").fill(emailA);
  await pageA.getByLabel("Password").fill("correct-horse-battery-staple");
  await pageA.getByRole("button", { name: "Create account" }).click();
  await expect(pageA).toHaveURL(/\/onboarding/, { timeout: 15_000 });
  await pageA.getByLabel("Workspace name").fill("A's Workspace");
  await pageA.getByRole("button", { name: "Create workspace" }).click();
  await expect(pageA).toHaveURL(/\/w\//, { timeout: 15_000 });

  await pageA.getByRole("button", { name: "New" }).first().click();
  await pageA.getByRole("menuitem", { name: "Page" }).click();
  await expect(pageA).toHaveURL(/\/p\//, { timeout: 15_000 });
  const pageUrl = pageA.url();

  await pageA.getByRole("button", { name: "Share" }).click();
  await pageA.getByPlaceholder("Invite by email…").fill(emailB);
  await pageA.getByRole("button", { name: "Invite" }).click();
  await expect(pageA.getByText("Realtime B")).toBeVisible({ timeout: 5_000 });
  await pageA.keyboard.press("Escape");

  await pageB.goto(pageUrl);
  await expect(pageB).toHaveURL(pageUrl, { timeout: 15_000 });

  // Both sides must finish the Hocuspocus handshake before either types — otherwise an
  // edit made before the socket is up would only reach the other side once it connects
  // (still correct, since Yjs syncs on connect, but this test wants to prove *live*
  // propagation, not eventual).
  await expect(pageA.getByText("Live")).toBeVisible({ timeout: 15_000 });
  await expect(pageB.getByText("Live")).toBeVisible({ timeout: 15_000 });

  const editorA = pageA.locator(".prose-editor");
  const editorB = pageB.locator(".prose-editor");

  await editorA.click();
  await pageA.keyboard.type("Hello from A");
  await expect(editorB).toContainText("Hello from A", { timeout: 10_000 });

  await editorB.click();
  await pageB.keyboard.press("End");
  // A brief settle: `End`'s caret position is computed against B's current doc state,
  // and typing immediately can race a just-arrived remote position remap from A's side
  // (both editors are live at this point) — real typing is never this instantaneous.
  await pageB.waitForTimeout(300);
  await pageB.keyboard.type(" and B", { delay: 30 });
  await expect(editorA).toContainText("Hello from A and B", { timeout: 10_000 });

  // Presence: each side shows an avatar (fallback initials) for the other collaborator
  // in the header — "Realtime B" -> "RB", "Realtime A" -> "RA".
  await expect(pageA.getByText("RB", { exact: true })).toBeVisible();
  await expect(pageB.getByText("RA", { exact: true })).toBeVisible();
});
