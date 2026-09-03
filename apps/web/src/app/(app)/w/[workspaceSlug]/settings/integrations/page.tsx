import { notFound } from "next/navigation";
import { requireUserId } from "@/server/session";
import { getWorkspaceBySlugForUser } from "@/server/workspaces/queries";
import { getGoogleIntegrationStatus } from "@/server/integrations/google-calendar/status";
import { GoogleIntegrationCard } from "./google-integration-card";

export default async function IntegrationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ workspaceSlug: string }>;
  searchParams: Promise<{ google?: string }>;
}) {
  const [{ workspaceSlug }, { google }, userId] = await Promise.all([params, searchParams, requireUserId()]);
  const workspace = await getWorkspaceBySlugForUser(userId, workspaceSlug);
  if (!workspace) notFound();

  const status = await getGoogleIntegrationStatus(userId, workspace.id);

  return (
    <div>
      <h1 className="mb-1 text-lg font-semibold text-text">Integrations</h1>
      <p className="mb-6 text-sm text-text-muted">Connect outside tools to this workspace.</p>
      <GoogleIntegrationCard
        workspaceSlug={workspaceSlug}
        workspaceId={workspace.id}
        initialStatus={status}
        callbackResult={google}
      />
    </div>
  );
}
