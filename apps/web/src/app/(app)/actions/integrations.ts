"use server";

import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import { disconnectGoogleCalendar } from "@/server/integrations/google-calendar/disconnect";
import { syncWorkspaceGoogleCalendar } from "@/server/integrations/google-calendar/sync";
import { listGoogleCalendars, selectGoogleCalendar } from "@/server/integrations/google-calendar/connect";
import type { SelectGoogleCalendarInput } from "@notion-clone/contracts";

export async function disconnectGoogleAction() {
  const userId = await requireUserId();
  return runAction(() => disconnectGoogleCalendar(userId));
}

export async function syncGoogleCalendarAction(workspaceId: string) {
  const userId = await requireUserId();
  return runAction(() => syncWorkspaceGoogleCalendar(userId, workspaceId));
}

export async function listGoogleCalendarsAction() {
  const userId = await requireUserId();
  return runAction(() => listGoogleCalendars(userId));
}

export async function selectGoogleCalendarAction(input: SelectGoogleCalendarInput) {
  const userId = await requireUserId();
  return runAction(() => selectGoogleCalendar(userId, input));
}
