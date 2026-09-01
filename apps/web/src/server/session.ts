import "server-only";
import { auth } from "@notion-clone/auth";
import { UnauthorizedError } from "@notion-clone/shared";

/** Returns the current session's user id, or null if not signed in. Use this — not
 * `auth()` directly — in server actions/route handlers so "who is asking" is always
 * resolved the same way. */
export async function getCurrentUserId(): Promise<string | null> {
  const session = await auth();
  return session?.user?.id ?? null;
}

/** Throws UnauthorizedError instead of returning null. Use at the top of any server
 * action/route that requires authentication. */
export async function requireUserId(): Promise<string> {
  const userId = await getCurrentUserId();
  if (!userId) throw new UnauthorizedError();
  return userId;
}
