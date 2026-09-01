import "server-only";
import { db, searchDocuments, pages, pageShares, sql, eq, and } from "@notion-clone/database";
import { searchSchema, type SearchInput, type SearchResult, type SearchProvider } from "@notion-clone/contracts";
import { getWorkspaceRole } from "../permissions/workspace-role";

/**
 * Postgres full-text search implementation of the `SearchProvider` contract. Permission
 * filtering happens in the SQL itself (not post-filtered in application code) so a
 * result never round-trips to the server before being denied — see docs/SECURITY.md
 * "Search results must respect permissions".
 *
 * Known phase-1 limitation: this checks the page's own visibility/explicit share, not
 * inherited access from an ancestor's explicit share (the full permission walk in
 * permissions/resolve.ts). A page reachable only via an ancestor share won't surface in
 * search yet. Documented in docs/NOTION_PARITY.md.
 */
export class PostgresSearchProvider implements SearchProvider {
  async search(input: SearchInput & { requesterId: string }): Promise<SearchResult[]> {
    const { workspaceId, query, limit } = searchSchema.parse(input);
    const role = await getWorkspaceRole(input.requesterId, workspaceId);
    if (!role) return [];

    const tsQuery = sql`websearch_to_tsquery('english', ${query})`;

    const rows = await db
      .select({
        pageId: pages.id,
        title: pages.title,
        icon: pages.icon,
        updatedAt: pages.updatedAt,
        body: searchDocuments.body,
        rank: sql<number>`ts_rank(${searchDocuments.tsv}, ${tsQuery})`,
      })
      .from(searchDocuments)
      .innerJoin(pages, eq(pages.id, searchDocuments.pageId))
      .leftJoin(
        pageShares,
        and(eq(pageShares.pageId, pages.id), eq(pageShares.userId, input.requesterId)),
      )
      .where(
        and(
          eq(pages.workspaceId, workspaceId),
          eq(pages.isArchived, false),
          sql`${searchDocuments.tsv} @@ ${tsQuery}`,
          sql`(
            ${pages.createdByUserId} = ${input.requesterId}
            OR (${pages.visibility} = 'workspace' AND ${role !== "guest"})
            OR ${pageShares.id} IS NOT NULL
          )`,
        ),
      )
      .orderBy(sql`ts_rank(${searchDocuments.tsv}, ${tsQuery}) DESC`)
      .limit(limit ?? 20);

    return rows.map((row) => ({
      pageId: row.pageId,
      title: row.title || "Untitled",
      icon: row.icon,
      snippet: row.body.slice(0, 160),
      rank: row.rank,
      updatedAt: row.updatedAt.toISOString(),
    }));
  }
}

export const searchProvider = new PostgresSearchProvider();
