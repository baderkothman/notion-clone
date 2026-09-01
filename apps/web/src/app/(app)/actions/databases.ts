"use server";

import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import { listProperties, createProperty, updateProperty, deleteProperty } from "@/server/databases/properties";
import { createRow, listRows, setRowValue } from "@/server/databases/rows";
import { listViews, createView, updateView } from "@/server/databases/views";
import type {
  CreatePropertyInput,
  UpdatePropertyInput,
  DeletePropertyInput,
  SetRowValueInput,
  CreateViewInput,
  UpdateViewInput,
} from "@notion-clone/contracts";

export async function listPropertiesAction(databasePageId: string) {
  const userId = await requireUserId();
  return runAction(() => listProperties(userId, databasePageId));
}

export async function createPropertyAction(input: CreatePropertyInput) {
  const userId = await requireUserId();
  return runAction(() => createProperty(userId, input));
}

export async function updatePropertyAction(input: UpdatePropertyInput) {
  const userId = await requireUserId();
  return runAction(() => updateProperty(userId, input));
}

export async function deletePropertyAction(input: DeletePropertyInput) {
  const userId = await requireUserId();
  return runAction(() => deleteProperty(userId, input));
}

export async function createRowAction(databasePageId: string, workspaceId: string) {
  const userId = await requireUserId();
  return runAction(() => createRow(userId, databasePageId, workspaceId));
}

export async function listRowsAction(databasePageId: string) {
  const userId = await requireUserId();
  return runAction(() => listRows(userId, databasePageId));
}

export async function setRowValueAction(input: SetRowValueInput) {
  const userId = await requireUserId();
  return runAction(() => setRowValue(userId, input));
}

export async function listViewsAction(databasePageId: string) {
  const userId = await requireUserId();
  return runAction(() => listViews(userId, databasePageId));
}

export async function createViewAction(input: CreateViewInput) {
  const userId = await requireUserId();
  return runAction(() => createView(userId, input));
}

export async function updateViewAction(input: UpdateViewInput) {
  const userId = await requireUserId();
  return runAction(() => updateView(userId, input));
}
