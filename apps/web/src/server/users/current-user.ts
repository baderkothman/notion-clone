import "server-only";
import { db, users, eq } from "@notion-clone/database";

export async function getUserProfile(userId: string) {
  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, image: users.image })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);
  return user ?? null;
}
