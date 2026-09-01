# ADR 0002: JWT sessions over database sessions

## Status
Accepted

## Context
Auth.js v5 offers two session strategies: `"database"` (a session row per login,
server-revocable, but every session check is a DB read) and `"jwt"` (signed/encrypted
cookie, no DB read to validate, but revocation is bounded by token expiry rather than
instant). `src/middleware.ts` runs on every non-static request to decide whether to
redirect to sign-in, and Next.js's Edge middleware runtime doesn't support the Node APIs
(`postgres`/Drizzle's TCP driver) a database-session check would need.

## Decision
Use the JWT strategy. `packages/auth/src/edge-config.ts` is the Edge-safe half (no
providers, so no database access) used only by middleware via `@notion-clone/auth/edge`;
`packages/auth/src/config.ts` (Node-only) extends it with the real Credentials provider
for the API route handler and server-side `auth()` calls.

## Consequences
- No server-side "sign out everywhere" by deleting a session row — a compromised session
  is bounded by the cookie's 30-day `maxAge`, not instantly revocable. If that becomes a
  requirement, the fix is a short-lived JWT (e.g. 15 minutes) with silent refresh against
  a database-backed refresh token, not reverting to the database strategy wholesale.
- The `users`/`accounts`/`sessions`/`verification_tokens` tables
  (`packages/database/src/schema/identity.ts`) stay in the schema unused by the current
  Credentials-only flow, reserved for a future OAuth provider (which needs the adapter's
  account-linking, and could reintroduce database sessions for that provider only).
- Importing `packages/auth/src/config.ts` (the Node-only full config) from middleware is
  a build-breaking mistake (pulls in `node:crypto` via the rate limiter, which the Edge
  webpack bundle can't resolve) — this is called out explicitly in both files' comments.
