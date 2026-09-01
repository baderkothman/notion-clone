import "server-only";
import { db, workspaces, workspaceMembers } from "@notion-clone/database";
import { createWorkspaceSchema, type CreateWorkspaceInput } from "@notion-clone/contracts";
import { newToken } from "@notion-clone/shared";

function slugify(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  return `${base || "workspace"}-${newToken(3).toLowerCase().replace(/[^a-z0-9]/g, "")}`;
}

export async function createWorkspace(userId: string, raw: CreateWorkspaceInput) {
  const { name } = createWorkspaceSchema.parse(raw);
  const slug = slugify(name);

  return db.transaction(async (tx) => {
    const [workspace] = await tx
      .insert(workspaces)
      .values({ name, slug, ownerId: userId })
      .returning();
    if (!workspace) throw new Error("Failed to create workspace.");

    await tx.insert(workspaceMembers).values({
      workspaceId: workspace.id,
      userId,
      role: "owner",
    });

    return workspace;
  });
}
