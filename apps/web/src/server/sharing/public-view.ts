import "server-only";
import { db, pages, documents, eq, and } from "@notion-clone/database";

/**
 * Looks up a page by its public-share token. No session/permission check — the
 * unguessable token IS the authorization, exactly like an invitation or password-reset
 * token (see docs/SECURITY.md's token-handling pattern). Still requires
 * `publicShareEnabled` to currently be true: toggling sharing off invalidates the link
 * immediately even though the token value itself isn't rotated, and the token column has
 * a unique index so this is an O(1) lookup, not a scan.
 */
export async function getPageByPublicToken(token: string) {
  const [page] = await db
    .select()
    .from(pages)
    .where(and(eq(pages.publicShareToken, token), eq(pages.publicShareEnabled, true)))
    .limit(1);
  if (!page || page.isArchived) return null;

  const [document] = await db.select().from(documents).where(eq(documents.pageId, page.id)).limit(1);
  return { page, document: document ?? null };
}
