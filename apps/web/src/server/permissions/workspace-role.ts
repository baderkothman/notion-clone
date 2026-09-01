import "server-only";
import { db, workspaceMembers, eq, and } from "@notion-clone/database";
import type { WorkspaceRole } from "@notion-clone/contracts";

/** No membership row = no access, full stop. This is the root of every authorization
 * decision in the app (see docs/SECURITY.md "Authorization"). */
export async function getWorkspaceRole(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole | null> {
  const [row] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, userId)))
    .limit(1);
  return row?.role ?? null;
}
