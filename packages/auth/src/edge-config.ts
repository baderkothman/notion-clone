import type { NextAuthConfig } from "next-auth";

/**
 * The Edge-safe half of the Auth.js config: no providers (so no Credentials
 * `authorize`, which needs Postgres + Node's `crypto` module — neither works on the
 * Edge runtime), just enough to decode/verify the JWT session cookie. This is what
 * `src/middleware.ts` uses via `@notion-clone/auth/edge` for its redirect check.
 * `config.ts` (Node-only) spreads this and adds the real Credentials provider for the
 * API route handler and server-side `auth()` calls. See docs/ARCHITECTURE.md "Why
 * Node.js middleware isn't used here".
 */
export const edgeAuthConfig: NextAuthConfig = {
  session: { strategy: "jwt", maxAge: 30 * 24 * 60 * 60 },
  pages: { signIn: "/sign-in" },
  trustHost: true,
  cookies: {
    sessionToken: {
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
  providers: [],
  callbacks: {
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      return session;
    },
  },
};
