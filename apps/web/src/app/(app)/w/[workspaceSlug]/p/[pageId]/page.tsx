import { notFound } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { EmptyState } from "@notion-clone/ui";
import { EMPTY_TIPTAP_DOC } from "@notion-clone/editor";
import { requireUserId } from "@/server/session";
import { getPageWithDocument, getBreadcrumbs } from "@/server/pages/queries";
import { resolvePagePermission } from "@/server/permissions/resolve";
import { roleAtLeast } from "@/server/permissions/resolve-core";
import { NotFoundError, ForbiddenError } from "@notion-clone/shared";
import { PageView } from "@/components/page/page-view";

export default async function PageRoute({
  params,
}: {
  params: Promise<{ workspaceSlug: string; pageId: string }>;
}) {
  const { workspaceSlug, pageId } = await params;
  const userId = await requireUserId();

  let data: Awaited<ReturnType<typeof getPageWithDocument>>;
  try {
    data = await getPageWithDocument(userId, pageId);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    if (error instanceof ForbiddenError) {
      return (
        <div className="flex h-full items-center justify-center">
          <EmptyState
            icon={<ShieldAlert className="h-8 w-8" />}
            title="You don't have access to this page"
            description="Ask the page owner to share it with you, or switch accounts if you expected access."
          />
        </div>
      );
    }
    throw error;
  }
  if (!data) notFound();

  const { page, document } = data;
  const permission = await resolvePagePermission(userId, pageId);
  const editable = roleAtLeast(permission.role, "edit");
  const breadcrumbTrail = await getBreadcrumbs(pageId);

  return (
    <PageView
      workspaceId={page.workspaceId}
      workspaceSlug={workspaceSlug}
      page={{
        id: page.id,
        title: page.title,
        icon: page.icon,
        coverImage: page.coverImage,
        visibility: page.visibility,
        publicShareEnabled: page.publicShareEnabled,
        publicShareToken: page.publicShareToken,
      }}
      content={document?.content ?? EMPTY_TIPTAP_DOC}
      documentVersion={document?.version ?? 1}
      breadcrumbTrail={breadcrumbTrail}
      editable={editable}
    />
  );
}
