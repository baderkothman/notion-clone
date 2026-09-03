import { FileText } from "lucide-react";
import { EmptyState } from "@notion-clone/ui";
import { requireUserId } from "@/server/session";
import { getWorkspaceBySlugForUser } from "@/server/workspaces/queries";
import { notFound } from "next/navigation";
import { NewPageButton } from "./new-page-button";

export default async function WorkspaceHomePage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const [{ workspaceSlug }, userId] = await Promise.all([params, requireUserId()]);
  const workspace = await getWorkspaceBySlugForUser(userId, workspaceSlug);
  if (!workspace) notFound();

  return (
    <div className="flex h-full items-center justify-center">
      <EmptyState
        icon={<FileText className="size-8" />}
        title={`Welcome to ${workspace.name}`}
        description="Create your first page to get started, or pick one from the sidebar."
        action={<NewPageButton workspaceId={workspace.id} workspaceSlug={workspace.slug} />}
      />
    </div>
  );
}
