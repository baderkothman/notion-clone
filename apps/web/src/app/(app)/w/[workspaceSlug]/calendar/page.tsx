import { notFound } from "next/navigation";
import { requireUserId } from "@/server/session";
import { getWorkspaceBySlugForUser } from "@/server/workspaces/queries";
import { listCalendarEvents } from "@/server/calendar/queries";
import { getGoogleIntegrationStatus } from "@/server/integrations/google-calendar/status";
import { ROLE_CAPABILITIES } from "@notion-clone/contracts";
import { getQueryRangeForView } from "@/components/calendar/calendar-date-utils";
import { CalendarShell } from "@/components/calendar/calendar-shell";

export default async function CalendarPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const [{ workspaceSlug }, userId] = await Promise.all([params, requireUserId()]);
  const workspace = await getWorkspaceBySlugForUser(userId, workspaceSlug);
  if (!workspace) notFound();
  // Guests are scoped to specific shared pages, not the workspace-wide calendar — see
  // ROLE_CAPABILITIES's `useCalendar` and its doc comment in workspaces.ts.
  if (!ROLE_CAPABILITIES[workspace.role].useCalendar) notFound();

  const range = getQueryRangeForView("month", new Date());
  const [events, googleStatus] = await Promise.all([
    listCalendarEvents(userId, { workspaceId: workspace.id, rangeStart: range.rangeStart, rangeEnd: range.rangeEnd }),
    getGoogleIntegrationStatus(userId, workspace.id),
  ]);

  return (
    <div className="flex h-full flex-col">
      <CalendarShell
        workspaceId={workspace.id}
        initialEvents={events}
        initialRangeStart={range.rangeStart}
        initialRangeEnd={range.rangeEnd}
        googleConnectionId={googleStatus.connected ? googleStatus.connectionId : null}
      />
    </div>
  );
}
