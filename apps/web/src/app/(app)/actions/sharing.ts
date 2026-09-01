"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import {
  sharePage,
  listShares,
  updateShareRole,
  revokeShare,
  setPageVisibility,
  setPublicShare,
} from "@/server/sharing/share";
import type {
  SharePageInput,
  UpdateShareRoleInput,
  RevokeShareInput,
  SetPageVisibilityInput,
  SetPublicShareInput,
} from "@notion-clone/contracts";

export async function sharePageAction(input: SharePageInput) {
  const userId = await requireUserId();
  const result = await runAction(() => sharePage(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function listSharesAction(pageId: string) {
  const userId = await requireUserId();
  return runAction(() => listShares(userId, pageId));
}

export async function updateShareRoleAction(input: UpdateShareRoleInput) {
  const userId = await requireUserId();
  return runAction(() => updateShareRole(userId, input));
}

export async function revokeShareAction(input: RevokeShareInput) {
  const userId = await requireUserId();
  const result = await runAction(() => revokeShare(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function setPageVisibilityAction(input: SetPageVisibilityInput) {
  const userId = await requireUserId();
  const result = await runAction(() => setPageVisibility(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function setPublicShareAction(input: SetPublicShareInput) {
  const userId = await requireUserId();
  return runAction(() => setPublicShare(userId, input));
}
