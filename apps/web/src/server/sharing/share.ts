import "server-only";
import { db, pages, pageShares, users, workspaceMembers, eq, and } from "@notion-clone/database";
import {
  sharePageSchema,
  revokeShareSchema,
  setPageVisibilitySchema,
  setPublicShareSchema,
  type SharePageInput,
  type RevokeShareInput,
  type SetPageVisibilityInput,
  type SetPublicShareInput,
} from "@notion-clone/contracts";
import { ValidationError } from "@notion-clone/shared";
import { newToken } from "@notion-clone/shared";
import { assertPagePermission } from "../permissions/assert";

/** Sharing a page requires "full" permission (not merely "edit") — granting access to
 * others is a stronger capability than editing content. Matches Notion's "only people
 * with full access can share" model. */
export async function sharePage(actorUserId: string, raw: SharePageInput) {
  const input = sharePageSchema.parse(raw);
  const { workspaceId } = await assertPagePermission(actorUserId, input.pageId, "full");

  const [targetUser] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (!targetUser) {
    throw new ValidationError("No account found for that email. Invite them to the workspace first.");
  }

  // Sharing implicitly makes the target a guest if they aren't already a workspace
  // member — matches "guests" in the product spec: access to specific shared pages
  // without full workspace membership.
  const [membership] = await db
    .select()
    .from(workspaceMembers)
    .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, targetUser.id)))
    .limit(1);
  if (!membership) {
    await db.insert(workspaceMembers).values({ workspaceId, userId: targetUser.id, role: "guest" });
  }

  await db
    .insert(pageShares)
    .values({ pageId: input.pageId, userId: targetUser.id, role: input.role, createdByUserId: actorUserId })
    .onConflictDoUpdate({
      target: [pageShares.pageId, pageShares.userId],
      set: { role: input.role },
    });

  return targetUser;
}

export async function listShares(userId: string, pageId: string) {
  await assertPagePermission(userId, pageId, "full");
  return db
    .select({
      userId: users.id,
      name: users.name,
      email: users.email,
      image: users.image,
      role: pageShares.role,
    })
    .from(pageShares)
    .innerJoin(users, eq(users.id, pageShares.userId))
    .where(eq(pageShares.pageId, pageId));
}

export async function revokeShare(actorUserId: string, raw: RevokeShareInput) {
  const input = revokeShareSchema.parse(raw);
  await assertPagePermission(actorUserId, input.pageId, "full");
  await db.delete(pageShares).where(and(eq(pageShares.pageId, input.pageId), eq(pageShares.userId, input.userId)));
}

export async function setPageVisibility(actorUserId: string, raw: SetPageVisibilityInput) {
  const input = setPageVisibilitySchema.parse(raw);
  await assertPagePermission(actorUserId, input.pageId, "full");
  await db.update(pages).set({ visibility: input.visibility }).where(eq(pages.id, input.pageId));
}

export async function setPublicShare(actorUserId: string, raw: SetPublicShareInput) {
  const input = setPublicShareSchema.parse(raw);
  await assertPagePermission(actorUserId, input.pageId, "full");

  const [page] = await db.select().from(pages).where(eq(pages.id, input.pageId)).limit(1);
  if (!page) throw new ValidationError("Page not found.");

  const publicShareToken = input.enabled ? (page.publicShareToken ?? newToken()) : page.publicShareToken;

  await db
    .update(pages)
    .set({
      publicShareEnabled: input.enabled,
      publicShareRole: input.role ?? page.publicShareRole,
      publicShareToken,
    })
    .where(eq(pages.id, input.pageId));

  return { publicShareToken };
}
