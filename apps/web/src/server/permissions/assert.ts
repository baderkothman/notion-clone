import "server-only";
import { ForbiddenError, NotFoundError } from "@notion-clone/shared";
import type { ShareRole, WorkspaceRole } from "@notion-clone/contracts";
import { ROLE_CAPABILITIES } from "@notion-clone/contracts";
import { resolvePagePermission } from "./resolve";
import { roleAtLeast } from "./resolve-core";
import { getWorkspaceRole } from "./workspace-role";

/**
 * The single entry point every page-scoped server action/route must call before doing
 * anything. Throws ForbiddenError (mapped to HTTP 403) rather than returning a boolean —
 * callers can't accidentally ignore a denial the way they could ignore a `false`.
 * Never trust a client-supplied pageId's implied access; this always re-resolves from
 * the database for the current session's user.
 */
export async function assertPagePermission(
  userId: string,
  pageId: string,
  minimum: ShareRole,
): Promise<{ workspaceId: string }> {
  const permission = await resolvePagePermission(userId, pageId);
  if (!permission.workspaceId) {
    throw new NotFoundError("Page");
  }
  if (!roleAtLeast(permission.role, minimum)) {
    throw new ForbiddenError();
  }
  return { workspaceId: permission.workspaceId };
}

export async function assertWorkspaceMembership(
  userId: string,
  workspaceId: string,
): Promise<WorkspaceRole> {
  const role = await getWorkspaceRole(userId, workspaceId);
  if (!role) throw new ForbiddenError("You are not a member of this workspace.");
  return role;
}

export async function assertWorkspaceCapability(
  userId: string,
  workspaceId: string,
  capability: keyof (typeof ROLE_CAPABILITIES)["owner"],
): Promise<WorkspaceRole> {
  const role = await assertWorkspaceMembership(userId, workspaceId);
  if (!ROLE_CAPABILITIES[role][capability]) {
    throw new ForbiddenError();
  }
  return role;
}
