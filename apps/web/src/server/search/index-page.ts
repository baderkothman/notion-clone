import "server-only";
import { db, searchDocuments, pages, eq, sql } from "@notion-clone/database";
import { extractPlainText } from "./extract-text";
import type { JSONContent } from "@notion-clone/contracts";

/** Upserts the search row for a page and recomputes its tsvector. Called from the title
 * and document write paths — see docs/DATABASE.md "Search" for why this is denormalized
 * instead of a DB trigger. */
export async function indexPageTitle(pageId: string, title: string) {
  await upsert(pageId, { title });
}

export async function indexPageBody(pageId: string, content: JSONContent) {
  await upsert(pageId, { body: extractPlainText(content).slice(0, 100_000) });
}

async function upsert(pageId: string, patch: { title?: string; body?: string }) {
  const [page] = await db.select({ workspaceId: pages.workspaceId, title: pages.title }).from(pages).where(eq(pages.id, pageId)).limit(1);
  if (!page) return;

  const title = patch.title ?? page.title;
  const bodyExpr = patch.body ?? undefined;

  await db
    .insert(searchDocuments)
    .values({
      pageId,
      workspaceId: page.workspaceId,
      title,
      body: patch.body ?? "",
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: searchDocuments.pageId,
      set: {
        title,
        ...(bodyExpr !== undefined ? { body: bodyExpr } : {}),
        updatedAt: new Date(),
      },
    });

  await db.execute(sql`
    UPDATE search_documents
    SET tsv = to_tsvector('english', coalesce(title, '') || ' ' || coalesce(body, ''))
    WHERE page_id = ${pageId}
  `);
}

export async function removeFromSearchIndex(pageId: string) {
  await db.delete(searchDocuments).where(eq(searchDocuments.pageId, pageId));
}
