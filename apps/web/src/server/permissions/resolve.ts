import "server-only";
import { db, sql } from "@notion-clone/database";
import type { EffectivePermission } from "@notion-clone/contracts";
import { resolveEffectiveRole, type ChainEntry } from "./resolve-core";
import { getWorkspaceRole } from "./workspace-role";

interface ChainRow {
  [key: string]: unknown;
  page_id: string;
  visibility: "private" | "workspace";
  workspace_share_role: "view" | "comment" | "edit" | "full";
  explicit_role: "view" | "comment" | "edit" | "full" | null;
  created_by_user_id: string;
  workspace_id: string;
  depth: number;
}

/**
 * Resolves what `userId` can do with `pageId`: walks the ancestor chain in one recursive
 * query (never N+1 per ancestor) and hands the pure decision function in resolve-core.ts
 * everything it needs. This is the ONLY place page permission is computed — every
 * server action/route calls `assertPagePermission` (assert.ts), which calls this.
 */
export async function resolvePagePermission(
  userId: string,
  pageId: string,
): Promise<EffectivePermission & { workspaceId: string | null }> {
  const rows = await db.execute<ChainRow>(sql`
    WITH RECURSIVE ancestors AS (
      SELECT p.id AS page_id, p.parent_id, p.visibility, p.workspace_share_role,
             p.created_by_user_id, p.workspace_id, 0 AS depth
      FROM pages p
      WHERE p.id = ${pageId}
      UNION ALL
      SELECT p.id, p.parent_id, p.visibility, p.workspace_share_role,
             p.created_by_user_id, p.workspace_id, a.depth + 1
      FROM pages p
      INNER JOIN ancestors a ON p.id = a.parent_id
    )
    SELECT a.page_id, a.visibility, a.workspace_share_role,
           a.created_by_user_id, a.workspace_id, a.depth,
           ps.role AS explicit_role
    FROM ancestors a
    LEFT JOIN page_shares ps ON ps.page_id = a.page_id AND ps.user_id = ${userId}
    ORDER BY a.depth ASC
  `);

  if (rows.length === 0) {
    return { role: null, source: null, workspaceId: null };
  }

  const leaf = rows[0]!;
  const workspaceId = leaf.workspace_id;
  const workspaceRole = await getWorkspaceRole(userId, workspaceId);

  const chain: ChainEntry[] = rows.map((row) => ({
    pageId: row.page_id,
    visibility: row.visibility,
    workspaceShareRole: row.workspace_share_role,
    explicitRole: row.explicit_role,
  }));

  const permission = resolveEffectiveRole(chain, workspaceRole, leaf.created_by_user_id === userId);
  return { ...permission, workspaceId };
}
