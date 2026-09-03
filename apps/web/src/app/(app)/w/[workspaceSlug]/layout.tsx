import { notFound } from "next/navigation";
import { requireUserId } from "@/server/session";
import { getWorkspaceBySlugForUser, listUserWorkspaces } from "@/server/workspaces/queries";
import { listChildPages, listFavorites } from "@/server/pages/queries";
import { getUserProfile } from "@/server/users/current-user";
import { AppShell } from "@/components/app-shell";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const [{ workspaceSlug }, userId] = await Promise.all([params, requireUserId()]);

  const workspace = await getWorkspaceBySlugForUser(userId, workspaceSlug);
  if (!workspace) notFound();

  const [workspaces, rootPages, favorites, user] = await Promise.all([
    listUserWorkspaces(userId),
    listChildPages(userId, workspace.id, null),
    listFavorites(userId, workspace.id),
    getUserProfile(userId),
  ]);

  if (!user) notFound();

  return (
    <AppShell currentWorkspace={workspace} workspaces={workspaces} rootPages={rootPages} favorites={favorites} user={user}>
      {children}
    </AppShell>
  );
}
