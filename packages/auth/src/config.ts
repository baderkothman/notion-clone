import type { NextAuthConfig } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { db, users, eq } from "@notion-clone/database";
import { signInSchema } from "@notion-clone/contracts";
import { checkRateLimit } from "@notion-clone/shared";
import { verifyPassword } from "./password";
import { edgeAuthConfig } from "./edge-config";

/**
 * Full Auth.js configuration (Node-only — do not import this from middleware; use
 * `@notion-clone/auth/edge` there instead). Extends `edgeAuthConfig` with the real
 * Credentials provider, which needs Postgres and Node's `crypto`/bcrypt.
 */
export const authConfig: NextAuthConfig = {
  ...edgeAuthConfig,
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = signInSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        // Rate-limit by email to slow credential-stuffing without letting an attacker
        // lock out a victim's IP-independent login entirely (see docs/SECURITY.md).
        const limit = checkRateLimit(`auth:signin:${email}`, { max: 10, windowMs: 5 * 60_000 });
        if (!limit.allowed) return null;

        const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
        if (!user?.passwordHash) return null;

        const valid = await verifyPassword(password, user.passwordHash);
        if (!valid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
};
