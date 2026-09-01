import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, users, workspaces, workspaceMembers, eq } from "@notion-clone/database";
import { newToken } from "@notion-clone/shared";
import { createWorkspace } from "@/server/workspaces/create-workspace";
import { createPage } from "@/server/pages/create";
import { sharePage, setPageVisibility } from "@/server/sharing/share";
import { resolvePagePermission } from "@/server/permissions/resolve";

/**
 * Integration coverage for the recursive-CTE permission walk in resolve.ts — the SQL
 * query resolve-core.test.ts's pure unit tests can't reach, since that file only tests
 * the decision function given an already-built ancestor chain. This builds the chain
 * for real (nested pages, real shares) and asserts the same precedence rules hold
 * end-to-end. Requires a running Postgres — see docs/TESTING.md.
 */
describe("resolvePagePermission (integration)", () => {
  let owner: { id: string; email: string };
  let member: { id: string; email: string };
  let guest: { id: string; email: string };
  let outsider: { id: string; email: string };
  let workspaceId: string;

  async function makeUser(label: string, suffix: string) {
    const [user] = await db
      .insert(users)
      // sharePage looks users up by a lowercase-normalized email (see
      // sharePageSchema) — the stored email must already be lowercase for that lookup
      // to find it, same as the real sign-up path normalizes via emailSchema.
      .values({ name: label, email: `${label}-${suffix}@integration-test.local`.toLowerCase() })
      .returning();
    if (!user) throw new Error(`Failed to create test user "${label}".`);
    return user;
  }

  beforeAll(async () => {
    const suffix = newToken(6);
    owner = await makeUser("owner", suffix);
    member = await makeUser("member", suffix);
    guest = await makeUser("guest", suffix);
    outsider = await makeUser("outsider", suffix);

    const workspace = await createWorkspace(owner.id, { name: `Integration Test WS ${suffix}` });
    workspaceId = workspace.id;
    await db.insert(workspaceMembers).values([
      { workspaceId, userId: member.id, role: "member" },
      { workspaceId, userId: guest.id, role: "guest" },
    ]);
  });

  afterAll(async () => {
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId)); // cascades pages/shares/members
    await db.delete(users).where(eq(users.id, owner.id));
    await db.delete(users).where(eq(users.id, member.id));
    await db.delete(users).where(eq(users.id, guest.id));
    await db.delete(users).where(eq(users.id, outsider.id));
  });

  it("grants the creator full access to their own private page", async () => {
    const page = await createPage(owner.id, { workspaceId });
    const result = await resolvePagePermission(owner.id, page.id);
    expect(result).toEqual({ role: "full", source: "owner", workspaceId });
  });

  it("denies a workspace member with no share on a private page", async () => {
    const page = await createPage(owner.id, { workspaceId });
    const result = await resolvePagePermission(member.id, page.id);
    expect(result.role).toBeNull();
  });

  it("denies a user with no workspace membership at all", async () => {
    const page = await createPage(owner.id, { workspaceId });
    const result = await resolvePagePermission(outsider.id, page.id);
    expect(result.role).toBeNull();
    // Denied because of no membership, not because the page doesn't exist — the
    // resolver still identifies the correct workspace for the caller to distinguish
    // ForbiddenError from NotFoundError (see permissions/assert.ts).
    expect(result.workspaceId).toBe(workspaceId);
  });

  it("grants access via an explicit share, and that share is inherited by a child page", async () => {
    const parent = await createPage(owner.id, { workspaceId, title: "Parent" });
    await sharePage(owner.id, { pageId: parent.id, email: member.email, role: "edit" });

    const parentResult = await resolvePagePermission(member.id, parent.id);
    expect(parentResult).toEqual({ role: "edit", source: "explicit", workspaceId });

    const child = await createPage(owner.id, { workspaceId, parentId: parent.id, title: "Child" });
    const childResult = await resolvePagePermission(member.id, child.id);
    expect(childResult).toEqual({ role: "edit", source: "inherited", workspaceId });
  });

  it("grants workspace-visible pages to members but not guests", async () => {
    const page = await createPage(owner.id, { workspaceId });
    await setPageVisibility(owner.id, { pageId: page.id, visibility: "workspace" });

    const memberResult = await resolvePagePermission(member.id, page.id);
    expect(memberResult.role).toBe("edit"); // default workspaceShareRole

    const guestResult = await resolvePagePermission(guest.id, page.id);
    expect(guestResult.role).toBeNull();
  });

  it("prefers the nearest ancestor's explicit share over a farther ancestor's grant", async () => {
    const grandparent = await createPage(owner.id, { workspaceId, title: "Grandparent" });
    await sharePage(owner.id, { pageId: grandparent.id, email: member.email, role: "edit" });

    const parent = await createPage(owner.id, { workspaceId, parentId: grandparent.id, title: "Parent" });
    await sharePage(owner.id, { pageId: parent.id, email: member.email, role: "view" });

    const child = await createPage(owner.id, { workspaceId, parentId: parent.id, title: "Child" });
    const result = await resolvePagePermission(member.id, child.id);
    // Nearer ancestor (parent, "view") wins over the farther one (grandparent, "edit"),
    // even though "edit" is the stronger role.
    expect(result).toEqual({ role: "view", source: "inherited", workspaceId });
  });
});
