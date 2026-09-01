"use server";

import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import { saveDocument } from "@/server/blocks/save-document";
import type { SaveDocumentInput } from "@notion-clone/contracts";

/** No revalidatePath here on purpose: autosave fires every few seconds while the user is
 * actively looking at the editor. Invalidating the route on every keystroke-adjacent
 * save would fight the editor's own state. The sidebar picks up title/content changes
 * on next navigation or its own revalidation (see actions/pages.ts). */
export async function saveDocumentAction(input: SaveDocumentInput) {
  const userId = await requireUserId();
  return runAction(() => saveDocument(userId, input));
}
