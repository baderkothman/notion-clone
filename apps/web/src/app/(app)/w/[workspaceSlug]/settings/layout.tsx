import { notFound } from "next/navigation";
import { requireUserId } from "@/server/session";
import { getWorkspaceBySlugForUser } from "@/server/workspaces/queries";
import { SettingsNav } from "./settings-nav";

export default async function SettingsLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceSlug: string }>;
}) {
  const [{ workspaceSlug }, userId] = await Promise.all([params, requireUserId()]);
  const workspace = await getWorkspaceBySlugForUser(userId, workspaceSlug);
  if (!workspace) notFound();

  return (
    <div className="mx-auto flex max-w-4xl gap-8 px-8 py-10">
      <SettingsNav workspaceSlug={workspaceSlug} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
