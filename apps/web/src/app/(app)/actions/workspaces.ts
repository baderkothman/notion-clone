"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import { createWorkspace } from "@/server/workspaces/create-workspace";
import {
  inviteMember,
  updateMemberRole,
  removeMember,
  acceptInvitation,
  getInvitationPreview,
} from "@/server/workspaces/members";
import { auth } from "@notion-clone/auth";
import type {
  CreateWorkspaceInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  RemoveMemberInput,
} from "@notion-clone/contracts";

export async function createWorkspaceAction(input: CreateWorkspaceInput) {
  const userId = await requireUserId();
  return runAction(() => createWorkspace(userId, input));
}

export async function inviteMemberAction(input: InviteMemberInput) {
  const userId = await requireUserId();
  const result = await runAction(() => inviteMember(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function updateMemberRoleAction(input: UpdateMemberRoleInput) {
  const userId = await requireUserId();
  const result = await runAction(() => updateMemberRole(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function removeMemberAction(input: RemoveMemberInput) {
  const userId = await requireUserId();
  const result = await runAction(() => removeMember(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
}

export async function getInvitationPreviewAction(token: string) {
  return runAction(() => getInvitationPreview(token));
}

export async function acceptInvitationAction(token: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { ok: false as const, error: "Sign in first to accept this invitation." };
  }
  const { id: userId, email } = session.user;
  return runAction(() => acceptInvitation(userId, email, token));
}
