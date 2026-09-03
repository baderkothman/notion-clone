import { NextResponse, type NextRequest } from "next/server";
import { requireUserId } from "@/server/session";
import { assertWorkspaceCapability } from "@/server/permissions/assert";
import { getWorkspaceBySlugForUser } from "@/server/workspaces/queries";
import { startGoogleConnect } from "@/server/integrations/google-calendar/connect";
import { isGoogleCalendarConfigured } from "@/server/integrations/google-calendar/env";

/**
 * Step 1 of the Google OAuth flow — a real GET endpoint (not a server action) because
 * the browser needs a top-level navigation to Google's own consent screen; a fetch-
 * based server action can't do that. Middleware already requires a signed-in session
 * for this path (it's not in PUBLIC_PATHS), so `requireUserId()` below never actually
 * throws in practice — it's kept as defense in depth, not the only gate.
 */
export async function GET(request: NextRequest) {
  if (!isGoogleCalendarConfigured()) {
    return NextResponse.json(
      { error: "Google Calendar isn't configured on this deployment." },
      { status: 501 },
    );
  }

  const workspaceSlug = request.nextUrl.searchParams.get("workspaceSlug");
  if (!workspaceSlug) {
    return NextResponse.json({ error: "Missing workspaceSlug." }, { status: 400 });
  }

  const userId = await requireUserId();
  const workspace = await getWorkspaceBySlugForUser(userId, workspaceSlug);
  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }
  // Re-checked again by every domain function this connection ever touches — this
  // check is what stops a member with no calendar access from *creating* the
  // connection in the first place, not the only place the capability is enforced.
  await assertWorkspaceCapability(userId, workspace.id, "useCalendar");

  const authorizeUrl = startGoogleConnect(userId, workspace.id);
  return NextResponse.redirect(authorizeUrl);
}
