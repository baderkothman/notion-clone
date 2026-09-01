import "server-only";
import { db, workspaces, workspaceMembers, users, eq, and, desc } from "@notion-clone/database";

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
