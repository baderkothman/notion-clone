import "server-only";
import { db, users, eq } from "@notion-clone/database";
import { signUpSchema, type SignUpInput } from "@notion-clone/contracts";
import { hashPassword } from "@notion-clone/auth";
import { ConflictError, checkRateLimit, RateLimitedError } from "@notion-clone/shared";

export async function signUpUser(raw: SignUpInput) {
  const input = signUpSchema.parse(raw);

  const limit = checkRateLimit(`auth:signup:${input.email}`, { max: 5, windowMs: 10 * 60_000 });
  if (!limit.allowed) throw new RateLimitedError();

  const [existing] = await db.select().from(users).where(eq(users.email, input.email)).limit(1);
  if (existing) throw new ConflictError("An account with that email already exists.");

  const passwordHash = await hashPassword(input.password);
  const [user] = await db
    .insert(users)
    .values({ name: input.name, email: input.email, passwordHash })
    .returning();
  return user;
}
