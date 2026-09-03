"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import { createPage } from "@/server/pages/create";
import {
  updatePageTitle,
  updatePageIcon,
  updatePageCover,
  toggleFavorite,
} from "@/server/pages/mutations";
import { movePage } from "@/server/pages/move";
import { archivePage, restorePage, deletePagePermanently } from "@/server/pages/archive";
import { duplicatePage } from "@/server/pages/duplicate";
import { listChildPages } from "@/server/pages/queries";
import type {
  CreatePageInput,
  UpdatePageTitleInput,
  UpdatePageIconInput,
  UpdatePageCoverInput,
  MovePageInput,
  ArchivePageInput,
  RestorePageInput,
  DeletePagePermanentlyInput,
  DuplicatePageInput,
  ToggleFavoriteInput,
} from "@notion-clone/contracts";

export async function createPageAction(input: CreatePageInput) {
  const userId = await requireUserId();
  const result = await runAction(() => createPage(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function updatePageTitleAction(input: UpdatePageTitleInput) {
  const userId = await requireUserId();
  const result = await runAction(() => updatePageTitle(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function updatePageIconAction(input: UpdatePageIconInput) {
  const userId = await requireUserId();
  const result = await runAction(() => updatePageIcon(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function updatePageCoverAction(input: UpdatePageCoverInput) {
  const userId = await requireUserId();
  const result = await runAction(() => updatePageCover(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function movePageAction(input: MovePageInput) {
  const userId = await requireUserId();
  const result = await runAction(() => movePage(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function archivePageAction(input: ArchivePageInput) {
  const userId = await requireUserId();
  const result = await runAction(() => archivePage(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function restorePageAction(input: RestorePageInput) {
  const userId = await requireUserId();
  const result = await runAction(() => restorePage(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function deletePagePermanentlyAction(input: DeletePagePermanentlyInput) {
  const userId = await requireUserId();
  const result = await runAction(() => deletePagePermanently(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function duplicatePageAction(input: DuplicatePageInput) {
  const userId = await requireUserId();
  const result = await runAction(() => duplicatePage(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function toggleFavoriteAction(input: ToggleFavoriteInput) {
  const userId = await requireUserId();
  const result = await runAction(() => toggleFavorite(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function listChildPagesAction(workspaceId: string, parentId: string | null) {
  const userId = await requireUserId();
  return runAction(() => listChildPages(userId, workspaceId, parentId));
}

