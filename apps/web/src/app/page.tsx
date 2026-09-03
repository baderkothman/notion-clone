import { redirect } from "next/navigation";
import { getCurrentUserId } from "@/server/session";
import { listUserWorkspaces } from "@/server/workspaces/queries";
import { LandingPage } from "@/components/landing/landing-page";

// Public marketing page for signed-out visitors (see PUBLIC_PATHS in
// src/middleware.ts) — a signed-in visitor is sent straight to their workspace,
// same as this route always did before the landing page existed.
export default async function RootPage() {
  const userId = await getCurrentUserId();
  if (!userId) return <LandingPage />;

  const workspaces = await listUserWorkspaces(userId);
  if (workspaces.length === 0) redirect("/onboarding");
  redirect(`/w/${workspaces[0]!.slug}`);
}
