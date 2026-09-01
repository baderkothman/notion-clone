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

export async function getRevision(userId: string, pageId: string, revisionId: string) {
  await assertPagePermission(userId, pageId, "view");
  const [row] = await db.select().from(pageRevisions).where(eq(pageRevisions.id, revisionId)).limit(1);
  if (!row || row.pageId !== pageId) return null;
  return row;
}
