import "server-only";
import { db, pageRevisions, users, eq, desc } from "@notion-clone/database";
import { assertPagePermission } from "../permissions/assert";

export async function listRevisions(userId: string, pageId: string) {
  await assertPagePermission(userId, pageId, "view");
  return db
    .select({
      id: pageRevisions.id,
      title: pageRevisions.title,
      createdAt: pageRevisions.createdAt,
      createdByName: users.name,
      createdByEmail: users.email,
    })
    .from(pageRevisions)
    .leftJoin(users, eq(users.id, pageRevisions.createdByUserId))
    .where(eq(pageRevisions.pageId, pageId))
    .orderBy(desc(pageRevisions.createdAt));
}
