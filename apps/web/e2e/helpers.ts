import { expect, type Page } from "@playwright/test";

/**
 * Waits for the editor to report that typed content has been captured, regardless of
 * whether this page ended up on the plain autosave path ("Saved") or realtime
 * collaboration ("Live") — see page-view.tsx's `collabOwnsSaving`. Whether realtime is
 * active for a given test run depends on the environment (apps/realtime + REALTIME_URL
 * configured or not), so tests that don't specifically care which mechanism did it
 * should use this instead of asserting "Saved" directly.
 *
 * This does NOT guarantee the content has reached Postgres yet when "Live" is the
 * branch taken — only that the socket is up (apps/realtime's `onStoreDocument` is
 * debounced, see server.ts's `maxDebounce`). Use `waitForContentPersisted` instead for
 * a test that goes on to reload / sign out and back in to verify durable persistence.
 */
export async function waitForEditorSynced(page: Page) {
  await expect(page.getByText("Saved").or(page.getByText("Live"))).toBeVisible({ timeout: 10_000 });
}

/** Like `waitForEditorSynced`, but additionally pads past apps/realtime's debounce
 * window when "Live" is the branch taken, so a caller that immediately reloads or signs
 * back in to check persistence isn't racing the not-yet-flushed write. */
export async function waitForContentPersisted(page: Page) {
  const live = page.getByText("Live");
  await waitForEditorSynced(page);
  if (await live.isVisible().catch(() => false)) {
    await page.waitForTimeout(4_500); // > apps/realtime's maxDebounce (4000ms), with margin
  }
}
