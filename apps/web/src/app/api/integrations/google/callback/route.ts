import { NextResponse, type NextRequest } from "next/server";
import { requireUserId } from "@/server/session";
import { getWorkspaceSlugById } from "@/server/workspaces/queries";
import { completeGoogleConnect } from "@/server/integrations/google-calendar/connect";
import { getGoogleConnectionByWorkspaceId } from "@/server/integrations/google-calendar/queries";
import { syncGoogleCalendar } from "@/server/integrations/google-calendar/sync";
import { verifyOAuthState } from "@/server/integrations/google-calendar/state";

/**
 * Step 2 — Google redirects the user's browser here with `code`+`state` (success) or
 * `error` (the user declined consent, or something else went wrong on Google's side).
 * Always ends in a redirect back into the app; never renders JSON, since a real
 * end-user's browser lands on this URL directly.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const error = params.get("error");
  const code = params.get("code");
  const state = params.get("state");

  // Resolve where to send the user back to *before* anything else — the workspace
  // slug lives inside the signed state token, which we can read even on the
  // "user declined" path (no code exchange needed for that).
  const statePayload = state ? verifyOAuthState(state) : null;
  const workspaceSlug = statePayload ? await getWorkspaceSlugById(statePayload.workspaceId) : null;
  const settingsUrl = new URL(
    workspaceSlug ? `/w/${workspaceSlug}/settings/integrations` : "/",
    request.nextUrl.origin,
  );

  if (error) {
    settingsUrl.searchParams.set("google", error === "access_denied" ? "declined" : "error");
    return NextResponse.redirect(settingsUrl);
  }
  if (!code || !state || !statePayload) {
    settingsUrl.searchParams.set("google", "error");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const userId = await requireUserId();
    await completeGoogleConnect(userId, code, state);

    // Run the first sync inline so the calendar isn't empty the moment the user lands
    // back on it — best-effort: a failure here doesn't undo the connection, it just
    // means the user's first view of the calendar is empty until they hit "Sync now"
    // (or their next opportunistic sync — see the calendar page).
    const connection = await getGoogleConnectionByWorkspaceId(statePayload.workspaceId);
    if (connection) {
      try {
        await syncGoogleCalendar(connection);
      } catch {
        // swallowed — see comment above
      }
    }

    settingsUrl.searchParams.set("google", "connected");
  } catch {
    settingsUrl.searchParams.set("google", "error");
  }

  return NextResponse.redirect(settingsUrl);
}
