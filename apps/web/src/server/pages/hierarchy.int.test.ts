import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db, users, workspaces, pages, eq, and } from "@notion-clone/database";
import { newToken } from "@notion-clone/shared";
import { ValidationError } from "@notion-clone/shared";
import { createWorkspace } from "@/server/workspaces/create-workspace";
import { createPage } from "@/server/pages/create";
import { movePage } from "@/server/pages/move";
import { duplicatePage } from "@/server/pages/duplicate";

/**
 * Integration coverage for page-tree operations that need real recursive queries
 * against Postgres: cycle prevention on move (move.ts's `wouldCreateCycle`) and
 * duplicate's recursive subtree clone. Requires a running Postgres — see
 * docs/TESTING.md.
 */
describe("page hierarchy operations (integration)", () => {
  let owner: { id: string };
  let workspaceId: string;

  beforeAll(async () => {
    const suffix = newToken(6);
    const [user] = await db.insert(users).values({ name: "owner", email: `owner-${suffix}@integration-test.local` }).returning();
    owner = user!;
    const workspace = await createWorkspace(owner.id, { name: `Hierarchy Test WS ${suffix}` });
    workspaceId = workspace.id;
  });

  afterAll(async () => {
    await db.delete(workspaces).where(eq(workspaces.id, workspaceId));
    await db.delete(users).where(eq(users.id, owner.id));
  });

  it("rejects moving a page into its own descendant", async () => {
    const grandparent = await createPage(owner.id, { workspaceId, title: "Grandparent" });
    const parent = await createPage(owner.id, { workspaceId, parentId: grandparent.id, title: "Parent" });
    const child = await createPage(owner.id, { workspaceId, parentId: parent.id, title: "Child" });

    await expect(movePage(owner.id, { pageId: grandparent.id, newParentId: child.id })).rejects.toThrow(ValidationError);

    // The tree must be unchanged after the rejected move.
    const [reloaded] = await db.select({ parentId: pages.parentId }).from(pages).where(eq(pages.id, grandparent.id)).limit(1);
    expect(reloaded?.parentId).toBeNull();
  });

  it("rejects moving a page into itself", async () => {
    const page = await createPage(owner.id, { workspaceId, title: "Self" });
    await expect(movePage(owner.id, { pageId: page.id, newParentId: page.id })).rejects.toThrow(ValidationError);
  });

  it("allows a legitimate move to a non-descendant parent", async () => {
    const a = await createPage(owner.id, { workspaceId, title: "A" });
    const b = await createPage(owner.id, { workspaceId, title: "B" });

    await movePage(owner.id, { pageId: b.id, newParentId: a.id });

    const [reloaded] = await db.select({ parentId: pages.parentId }).from(pages).where(eq(pages.id, b.id)).limit(1);
    expect(reloaded?.parentId).toBe(a.id);
  });

  it("duplicate clones the full subtree, including nested children and content, as new pages", async () => {
    const original = await createPage(owner.id, { workspaceId, title: "Original" });
    const child1 = await createPage(owner.id, { workspaceId, parentId: original.id, title: "Child 1" });
    await createPage(owner.id, { workspaceId, parentId: original.id, title: "Child 2" });
    await createPage(owner.id, { workspaceId, parentId: child1.id, title: "Grandchild" });

    const cloneId = await duplicatePage(owner.id, { pageId: original.id });
    expect(cloneId).not.toBe(original.id);

    const [clone] = await db.select().from(pages).where(eq(pages.id, cloneId)).limit(1);
    expect(clone?.title).toBe("Original (copy)");

    const cloneChildren = await db.select().from(pages).where(and(eq(pages.parentId, cloneId)));
    expect(cloneChildren).toHaveLength(2);
    expect(cloneChildren.map((c) => c.title).sort()).toEqual(["Child 1", "Child 2"]);

    const cloneChild1 = cloneChildren.find((c) => c.title === "Child 1")!;
    const cloneGrandchildren = await db.select().from(pages).where(eq(pages.parentId, cloneChild1.id));
    expect(cloneGrandchildren).toHaveLength(1);
    expect(cloneGrandchildren[0]?.title).toBe("Grandchild");

    // The original subtree is untouched by duplicating it.
    const originalChildren = await db.select().from(pages).where(eq(pages.parentId, original.id));
    expect(originalChildren).toHaveLength(2);
  });
});
