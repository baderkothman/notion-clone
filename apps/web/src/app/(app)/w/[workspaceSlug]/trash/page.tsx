import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { EmptyState } from "@notion-clone/ui";
import { requireUserId } from "@/server/session";
import { getWorkspaceBySlugForUser } from "@/server/workspaces/queries";
import { listTrash } from "@/server/pages/queries";
import { TrashList } from "./trash-list";

export default async function TrashPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const { workspaceSlug } = await params;
  const userId = await requireUserId();
  const workspace = await getWorkspaceBySlugForUser(userId, workspaceSlug);
  if (!workspace) notFound();

  const trashedPages = await listTrash(userId, workspace.id);

  return (
    <div className="mx-auto max-w-3xl px-8 py-10">
      <h1 className="mb-1 text-2xl font-semibold text-text">Trash</h1>
      <p className="mb-6 text-sm text-text-muted">
        Pages you&apos;ve archived. Restore them or delete permanently.
      </p>
      {trashedPages.length === 0 ? (
        <EmptyState icon={<Trash2 className="h-8 w-8" />} title="Trash is empty" />
      ) : (
        <TrashList workspaceSlug={workspaceSlug} pages={trashedPages} />
      )}
    </div>
  );
}
