import "server-only";
import { db, workspaces, eq, and, ne } from "@notion-clone/database";
import { updateWorkspaceSchema, type UpdateWorkspaceInput } from "@notion-clone/contracts";
import { ConflictError, NotFoundError } from "@notion-clone/shared";
import { assertWorkspaceCapability } from "../permissions/assert";

export async function updateWorkspace(userId: string, raw: UpdateWorkspaceInput) {
  const input = updateWorkspaceSchema.parse(raw);
  await assertWorkspaceCapability(userId, input.workspaceId, "manageWorkspace");

  if (input.slug) {
    const [existing] = await db
      .select({ id: workspaces.id })
      .from(workspaces)
      .where(and(eq(workspaces.slug, input.slug), ne(workspaces.id, input.workspaceId)))
      .limit(1);
    if (existing) throw new ConflictError("That URL is already taken by another workspace.");
  }

  const [workspace] = await db
    .update(workspaces)
    .set({
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.icon !== undefined ? { icon: input.icon } : {}),
      ...(input.slug !== undefined ? { slug: input.slug } : {}),
      updatedAt: new Date(),
    })
    .where(eq(workspaces.id, input.workspaceId))
    .returning();
  if (!workspace) throw new NotFoundError("Workspace");

  return workspace;
}
