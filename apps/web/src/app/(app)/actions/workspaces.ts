"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import { createWorkspace } from "@/server/workspaces/create-workspace";
import { updateWorkspace } from "@/server/workspaces/update-workspace";
import { listWorkspaceMembers } from "@/server/workspaces/queries";
import {
  inviteMember,
  updateMemberRole,
  removeMember,
  revokeInvitation,
  acceptInvitation,
} from "@/server/workspaces/members";
import { assertWorkspaceMembership } from "@/server/permissions/assert";
import { auth } from "@notion-clone/auth";
import type {
  CreateWorkspaceInput,
  UpdateWorkspaceInput,
  InviteMemberInput,
  UpdateMemberRoleInput,
  RemoveMemberInput,
  RevokeInvitationInput,
} from "@notion-clone/contracts";

export async function createWorkspaceAction(input: CreateWorkspaceInput) {
  const userId = await requireUserId();
  return runAction(() => createWorkspace(userId, input));
}

export async function updateWorkspaceAction(input: UpdateWorkspaceInput) {
  const userId = await requireUserId();
  const result = await runAction(() => updateWorkspace(userId, input));
  revalidatePath(`/w`, "layout");
  return result;
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

export async function revokeInvitationAction(input: RevokeInvitationInput) {
  const userId = await requireUserId();
  return runAction(() => revokeInvitation(userId, input));
}

export async function listWorkspaceMembersAction(workspaceId: string) {
  const userId = await requireUserId();
  return runAction(async () => {
    await assertWorkspaceMembership(userId, workspaceId);
    return listWorkspaceMembers(workspaceId);
  });
}

export async function acceptInvitationAction(token: string) {
  const session = await auth();
  if (!session?.user?.id || !session.user.email) {
    return { ok: false as const, error: "Sign in first to accept this invitation." };
  }
  const { id: userId, email } = session.user;
  return runAction(() => acceptInvitation(userId, email, token));
}
