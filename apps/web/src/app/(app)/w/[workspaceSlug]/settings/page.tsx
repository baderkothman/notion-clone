import { notFound } from "next/navigation";
import { requireUserId } from "@/server/session";
import { getWorkspaceBySlugForUser } from "@/server/workspaces/queries";
import { ROLE_CAPABILITIES } from "@notion-clone/contracts";
import { GeneralSettingsForm } from "./general-settings-form";

export default async function WorkspaceGeneralSettingsPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const [{ workspaceSlug }, userId] = await Promise.all([params, requireUserId()]);
  const workspace = await getWorkspaceBySlugForUser(userId, workspaceSlug);
  if (!workspace) notFound();

  const canManage = ROLE_CAPABILITIES[workspace.role].manageWorkspace;

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-text">General</h1>
      <p className="mb-6 text-sm text-text-muted">Workspace name, icon, and URL.</p>
      <GeneralSettingsForm
        workspaceId={workspace.id}
        name={workspace.name}
        icon={workspace.icon}
        slug={workspace.slug}
        editable={canManage}
      />
    </div>
  );
}
