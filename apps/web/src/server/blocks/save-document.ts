import "server-only";
import { db, documents, pages, eq, and, sql } from "@notion-clone/database";
import { saveDocumentSchema, type SaveDocumentInput } from "@notion-clone/contracts";
import { ConflictError } from "@notion-clone/shared";
import { assertPagePermission } from "../permissions/assert";
import { indexPageBody } from "../search/index-page";
import { maybeSnapshot } from "../history/snapshot-policy";

/**
 * The autosave write path. `expectedVersion` is the version the client last read; the
 * UPDATE is conditioned on it still matching, so two stale tabs (or a client racing a
 * collaborator's non-realtime edit) can't silently clobber each other — the loser gets a
 * ConflictError and the client reloads the latest content instead of overwriting it. See
 * docs/PRODUCT_SPEC.md "Autosave" and docs/ARCHITECTURE.md for how this composes with
 * the separate Yjs realtime path (which merges instead of conflicting).
 */
export async function saveDocument(userId: string, raw: SaveDocumentInput) {
  const input = saveDocumentSchema.parse(raw);
  await assertPagePermission(userId, input.pageId, "edit");

  const result = await db
    .update(documents)
    .set({
      content: input.content,
      version: sql`${documents.version} + 1`,
      updatedAt: new Date(),
      updatedByUserId: userId,
    })
    .where(and(eq(documents.pageId, input.pageId), eq(documents.version, input.expectedVersion)))
    .returning({ version: documents.version });

  if (result.length === 0) {
    const [current] = await db
      .select({ version: documents.version, content: documents.content })
      .from(documents)
      .where(eq(documents.pageId, input.pageId))
      .limit(1);
    throw new ConflictError(
      current
        ? `The document has changed since you last loaded it (server is at version ${current.version}).`
        : "The document no longer exists.",
    );
  }

  await db
    .update(pages)
    .set({ updatedAt: new Date(), lastEditedByUserId: userId })
    .where(eq(pages.id, input.pageId));

  await indexPageBody(input.pageId, input.content);
  await maybeSnapshot(input.pageId, userId, input.content);

  return { version: result[0]!.version };
}
