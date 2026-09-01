import { redirect } from "next/navigation";
import { requireUserId } from "@/server/session";
import { listUserWorkspaces } from "@/server/workspaces/queries";

export default async function RootPage() {
  const userId = await requireUserId();
  const workspaces = await listUserWorkspaces(userId);

  if (workspaces.length === 0) redirect("/onboarding");
  redirect(`/w/${workspaces[0]!.slug}`);
}
