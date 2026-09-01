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
import { listProperties } from "@/server/databases/properties";
import { listRows } from "@/server/databases/rows";
import { listViews } from "@/server/databases/views";
import { listWorkspaceMembers } from "@/server/workspaces/queries";
import { getUserProfile } from "@/server/users/current-user";
import { DatabasePageHeader } from "@/components/database/database-page-header";
import { DatabaseView } from "@/components/database/database-view";
import type { DatabaseProperty, DatabaseViewRecord } from "@/components/database/types";

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

  const pageHeaderProps = {
    id: page.id,
    title: page.title,
    icon: page.icon,
    visibility: page.visibility,
    publicShareEnabled: page.publicShareEnabled,
    publicShareToken: page.publicShareToken,
  };

  if (page.type === "database") {
    const [properties, { rows, values }, views, members] = await Promise.all([
      listProperties(userId, page.id),
      listRows(userId, page.id),
      listViews(userId, page.id),
      listWorkspaceMembers(page.workspaceId),
    ]);

    return (
      <div className="flex h-full flex-col overflow-y-auto">
        <DatabasePageHeader workspaceSlug={workspaceSlug} page={pageHeaderProps} breadcrumbTrail={breadcrumbTrail} />
        <DatabaseView
          workspaceId={page.workspaceId}
          workspaceSlug={workspaceSlug}
          databasePageId={page.id}
          editable={editable}
          initialProperties={properties as DatabaseProperty[]}
          initialRows={rows}
          initialValues={values}
          initialViews={views as DatabaseViewRecord[]}
          members={members}
        />
      </div>
    );
  }

  const currentUser = await getUserProfile(userId);

  return (
    <PageView
      workspaceId={page.workspaceId}
      workspaceSlug={workspaceSlug}
      page={{ ...pageHeaderProps, coverImage: page.coverImage }}
      content={document?.content ?? EMPTY_TIPTAP_DOC}
      documentVersion={document?.version ?? 1}
      breadcrumbTrail={breadcrumbTrail}
      editable={editable}
      currentUser={{ id: userId, name: currentUser?.name ?? currentUser?.email ?? "Anonymous" }}
      realtimeWsUrl={process.env.REALTIME_URL ?? null}
    />
  );
}
