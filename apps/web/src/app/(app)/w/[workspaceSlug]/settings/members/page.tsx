import { notFound } from "next/navigation";
import { requireUserId } from "@/server/session";
import { getWorkspaceBySlugForUser, listWorkspaceMembers, listPendingInvitations } from "@/server/workspaces/queries";
import { ROLE_CAPABILITIES } from "@notion-clone/contracts";
import { MembersManager } from "./members-manager";

export default async function WorkspaceMembersPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const [{ workspaceSlug }, userId] = await Promise.all([params, requireUserId()]);
  const workspace = await getWorkspaceBySlugForUser(userId, workspaceSlug);
  if (!workspace) notFound();

  const canManage = ROLE_CAPABILITIES[workspace.role].manageMembers;
  const [members, invitations] = await Promise.all([
    listWorkspaceMembers(workspace.id),
    canManage ? listPendingInvitations(workspace.id) : Promise.resolve([]),
  ]);

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-text">Members</h1>
      <p className="mb-6 text-sm text-text-muted">Who has access to this workspace.</p>
      <MembersManager
        workspaceId={workspace.id}
        currentUserId={userId}
        canManage={canManage}
        initialMembers={members}
        initialInvitations={invitations}
      />
    </div>
  );
}
