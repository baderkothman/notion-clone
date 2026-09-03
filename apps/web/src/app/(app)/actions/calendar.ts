"use server";

import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent } from "@/server/calendar/events";
import { listCalendarEvents } from "@/server/calendar/queries";
import type {
  CreateCalendarEventInput,
  UpdateCalendarEventInput,
  DeleteCalendarEventInput,
  ListCalendarEventsInput,
} from "@notion-clone/contracts";

export async function listCalendarEventsAction(input: ListCalendarEventsInput) {
  const userId = await requireUserId();
  return runAction(() => listCalendarEvents(userId, input));
}

export async function createCalendarEventAction(input: CreateCalendarEventInput) {
  const userId = await requireUserId();
  return runAction(() => createCalendarEvent(userId, input));
}

export async function updateCalendarEventAction(input: UpdateCalendarEventInput) {
  const userId = await requireUserId();
  return runAction(() => updateCalendarEvent(userId, input));
}

export async function deleteCalendarEventAction(input: DeleteCalendarEventInput) {
  const userId = await requireUserId();
  return runAction(() => deleteCalendarEvent(userId, input));
}
