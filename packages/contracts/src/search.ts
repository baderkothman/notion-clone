import { z } from "zod";

export const searchSchema = z.object({
  workspaceId: z.string().uuid(),
  query: z.string().trim().min(1).max(200),
  limit: z.number().int().positive().max(50).optional(),
});
export type SearchInput = z.infer<typeof searchSchema>;

export interface SearchResult {
  pageId: string;
  title: string;
  icon: string | null;
  snippet: string;
  rank: number;
  updatedAt: string;
}

/** Search backend abstraction. Phase 1 implements this with Postgres full-text search
 * (apps/web/src/server/search/postgres-search-provider.ts); a dedicated engine can be
 * swapped in later by implementing the same interface. */
export interface SearchProvider {
  search(input: SearchInput & { requesterId: string }): Promise<SearchResult[]>;
}
