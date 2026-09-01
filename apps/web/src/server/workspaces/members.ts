import "server-only";
import {
  db,
  workspaceMembers,
  workspaceInvitations,
  workspaces,
  users,
  eq,
  and,
} from "@notion-clone/database";
import {
  inviteMemberSchema,
  updateMemberRoleSchema,
  removeMemberSchema,
  revokeInvitationSchema,
  type InviteMemberInput,
  type UpdateMemberRoleInput,
  type RemoveMemberInput,
  type RevokeInvitationInput,
} from "@notion-clone/contracts";
import { ConflictError, ForbiddenError, ValidationError, newToken } from "@notion-clone/shared";
import { createHash } from "node:crypto";
import { assertWorkspaceCapability } from "../permissions/assert";

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

const INVITATION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

/** Returns the raw token once (to email to the invitee); only its hash is stored, the
 * same pattern as password-reset tokens — see docs/SECURITY.md. */
export async function inviteMember(actorUserId: string, raw: InviteMemberInput) {
  const input = inviteMemberSchema.parse(raw);
  await assertWorkspaceCapability(actorUserId, input.workspaceId, "manageMembers");

  const existingUser = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existingUser[0]) {
    const alreadyMember = await db
      .select()
      .from(workspaceMembers)
      .where(
        and(
          eq(workspaceMembers.workspaceId, input.workspaceId),
          eq(workspaceMembers.userId, existingUser[0].id),
        ),
      )
      .limit(1);
    if (alreadyMember[0]) {
      throw new ConflictError("This person is already a member of the workspace.");
    }
  }

  const token = newToken();
  const [invitation] = await db
    .insert(workspaceInvitations)
    .values({
      workspaceId: input.workspaceId,
      email: input.email,
      role: input.role,
      tokenHash: hashToken(token),
      invitedByUserId: actorUserId,
      expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
    })
    .onConflictDoUpdate({
      target: [workspaceInvitations.workspaceId, workspaceInvitations.email],
      set: {
        role: input.role,
        tokenHash: hashToken(token),
        invitedByUserId: actorUserId,
        expiresAt: new Date(Date.now() + INVITATION_TTL_MS),
        revokedAt: null,
        acceptedAt: null,
      },
    })
    .returning();
  if (!invitation) throw new Error("Failed to create invitation.");

  // Phase 1: no transactional email provider is wired up yet (see docs/PRODUCT_SPEC.md
  // Open Questions) — same pattern as password-reset. Logging server-side lets local
  // development exercise the full invite → accept flow.
  console.info(`[invite] token for ${input.email} to join workspace ${input.workspaceId}: ${token}`);

  return { invitation, token };
}

/** Public preview (no auth required — the unguessable token IS the authorization) so
 * the invite-acceptance page can show "Join Acme Inc" before the visitor signs in. */
export async function getInvitationPreview(token: string) {
  const [row] = await db
    .select({
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      expiresAt: workspaceInvitations.expiresAt,
      acceptedAt: workspaceInvitations.acceptedAt,
      revokedAt: workspaceInvitations.revokedAt,
      workspaceName: workspaces.name,
      workspaceSlug: workspaces.slug,
    })
    .from(workspaceInvitations)
    .innerJoin(workspaces, eq(workspaces.id, workspaceInvitations.workspaceId))
    .where(eq(workspaceInvitations.tokenHash, hashToken(token)))
    .limit(1);
  return row ?? null;
}

export async function acceptInvitation(userId: string, userEmail: string, token: string) {
  const [invitation] = await db
    .select()
    .from(workspaceInvitations)
    .where(eq(workspaceInvitations.tokenHash, hashToken(token)))
    .limit(1);

  if (!invitation) throw new ValidationError("This invitation link is invalid.");
  if (invitation.revokedAt) throw new ValidationError("This invitation has been revoked.");
  if (invitation.acceptedAt) throw new ValidationError("This invitation was already used.");
  if (invitation.expiresAt < new Date()) throw new ValidationError("This invitation has expired.");
  if (invitation.email !== userEmail.toLowerCase()) {
    throw new ForbiddenError("This invitation was sent to a different email address.");
  }

  return db.transaction(async (tx) => {
    await tx
      .insert(workspaceMembers)
      .values({ workspaceId: invitation.workspaceId, userId, role: invitation.role })
      .onConflictDoNothing();
    await tx
      .update(workspaceInvitations)
      .set({ acceptedAt: new Date() })
      .where(eq(workspaceInvitations.id, invitation.id));
    const [workspace] = await tx
      .select({ slug: workspaces.slug })
      .from(workspaces)
      .where(eq(workspaces.id, invitation.workspaceId))
      .limit(1);
    return { workspaceId: invitation.workspaceId, workspaceSlug: workspace?.slug ?? null };
  });
}

export async function updateMemberRole(actorUserId: string, raw: UpdateMemberRoleInput) {
  const input = updateMemberRoleSchema.parse(raw);
  await assertWorkspaceCapability(actorUserId, input.workspaceId, "manageMembers");

  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.id, input.memberId))
    .limit(1);
  if (!member || member.workspaceId !== input.workspaceId) {
    throw new ValidationError("Member not found in this workspace.");
  }
  if (member.role === "owner") {
    throw new ForbiddenError("The workspace owner's role cannot be changed.");
  }

  await db
    .update(workspaceMembers)
    .set({ role: input.role })
    .where(eq(workspaceMembers.id, input.memberId));
}

export async function removeMember(actorUserId: string, raw: RemoveMemberInput) {
  const input = removeMemberSchema.parse(raw);
  await assertWorkspaceCapability(actorUserId, input.workspaceId, "manageMembers");

  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(eq(workspaceMembers.id, input.memberId))
    .limit(1);
  if (!member || member.workspaceId !== input.workspaceId) {
    throw new ValidationError("Member not found in this workspace.");
  }
  if (member.role === "owner") {
    throw new ForbiddenError("The workspace owner cannot be removed.");
  }

  await db.delete(workspaceMembers).where(eq(workspaceMembers.id, input.memberId));
}

export async function revokeInvitation(actorUserId: string, raw: RevokeInvitationInput) {
  const input = revokeInvitationSchema.parse(raw);
  await assertWorkspaceCapability(actorUserId, input.workspaceId, "manageMembers");

  const [invitation] = await db
    .select()
    .from(workspaceInvitations)
    .where(eq(workspaceInvitations.id, input.invitationId))
    .limit(1);
  if (!invitation || invitation.workspaceId !== input.workspaceId) {
    throw new ValidationError("Invitation not found in this workspace.");
  }

  await db
    .update(workspaceInvitations)
    .set({ revokedAt: new Date() })
    .where(eq(workspaceInvitations.id, input.invitationId));
}
