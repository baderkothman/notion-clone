import "server-only";
import {
  db,
  workspaces,
  workspaceMembers,
  workspaceInvitations,
  users,
  eq,
  and,
  isNull,
  desc,
} from "@notion-clone/database";

/** Workspaces the user belongs to, most recently created first. Powers the workspace
 * switcher — never queries `workspaces` without joining through `workspaceMembers`, so a
 * user can only ever see workspaces they're a member of. */
export async function listUserWorkspaces(userId: string) {
  return db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      icon: workspaces.icon,
      role: workspaceMembers.role,
    })
    .from(workspaceMembers)
    .innerJoin(workspaces, eq(workspaces.id, workspaceMembers.workspaceId))
    .where(eq(workspaceMembers.userId, userId))
    .orderBy(desc(workspaces.createdAt));
}

export async function getWorkspaceBySlugForUser(userId: string, slug: string) {
  const [row] = await db
    .select({
      id: workspaces.id,
      name: workspaces.name,
      slug: workspaces.slug,
      icon: workspaces.icon,
      ownerId: workspaces.ownerId,
      role: workspaceMembers.role,
    })
    .from(workspaces)
    .innerJoin(
      workspaceMembers,
      and(eq(workspaceMembers.workspaceId, workspaces.id), eq(workspaceMembers.userId, userId)),
    )
    .where(eq(workspaces.slug, slug))
    .limit(1);
  return row ?? null;
}

/** Used only where a caller already has a trusted `workspaceId` (e.g. verified out of a
 * signed OAuth state token — see server/integrations/google-calendar/state.ts) and
 * needs the slug to build a redirect URL. Not a membership check itself — callers that
 * need authorization call `assertWorkspaceMembership`/`assertWorkspaceCapability`
 * separately; this is purely a slug lookup. */
export async function getWorkspaceSlugById(workspaceId: string): Promise<string | null> {
  const [row] = await db.select({ slug: workspaces.slug }).from(workspaces).where(eq(workspaces.id, workspaceId)).limit(1);
  return row?.slug ?? null;
}

export async function listWorkspaceMembers(workspaceId: string) {
  return db
    .select({
      id: workspaceMembers.id,
      userId: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: workspaceMembers.role,
      joinedAt: workspaceMembers.createdAt,
    })
    .from(workspaceMembers)
    .innerJoin(users, eq(users.id, workspaceMembers.userId))
    .where(eq(workspaceMembers.workspaceId, workspaceId))
    .orderBy(desc(workspaceMembers.createdAt));
}

/** Outstanding (not yet accepted, not revoked, not expired) invitations — shown
 * alongside members so an admin can see who's been asked but hasn't joined yet. */
export async function listPendingInvitations(workspaceId: string) {
  return db
    .select({
      id: workspaceInvitations.id,
      email: workspaceInvitations.email,
      role: workspaceInvitations.role,
      expiresAt: workspaceInvitations.expiresAt,
      createdAt: workspaceInvitations.createdAt,
    })
    .from(workspaceInvitations)
    .where(
      and(
        eq(workspaceInvitations.workspaceId, workspaceId),
        isNull(workspaceInvitations.acceptedAt),
        isNull(workspaceInvitations.revokedAt),
      ),
    )
    .orderBy(desc(workspaceInvitations.createdAt));
}
