import { redirect } from "next/navigation";
import { requireUserId } from "@/server/session";
import { listUserWorkspaces } from "@/server/workspaces/queries";
import { CreateWorkspaceForm } from "./create-workspace-form";

export default async function OnboardingPage() {
  const userId = await requireUserId();
  const workspaces = await listUserWorkspaces(userId);
  if (workspaces.length > 0) redirect(`/w/${workspaces[0]!.slug}`);

  return (
    <div className="flex min-h-dvh items-center justify-center bg-bg px-4">
      <div className="w-full max-w-sm rounded-lg border border-border bg-surface-raised p-6 shadow-[var(--color-shadow)]">
        <h1 className="text-lg font-semibold text-text">Create your workspace</h1>
        <p className="mt-1 text-sm text-text-muted">
          A workspace is where you and your team keep pages, docs, and databases.
        </p>
        <div className="mt-5">
          <CreateWorkspaceForm />
        </div>
      </div>
    </div>
  );
}
