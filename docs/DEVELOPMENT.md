# Development

## Prerequisites

- Node.js 20+ (developed against Node 24)
- pnpm 9+ (`corepack enable` or `npm i -g pnpm`)
- Docker (for local Postgres + MinIO)

## Setup

```bash
pnpm install
cp .env.example .env
# Fill in AUTH_SECRET and REALTIME_JWT_SECRET:
#   openssl rand -base64 32
docker compose up -d          # Postgres on :5433, MinIO on :9000/:9001
pnpm db:migrate
pnpm db:seed                  # optional — demo@example.com / demo-password-please-change
pnpm dev                      # starts apps/web on :3000
```

## ⚠️ The NODE_ENV footgun

**Never `source .env` into a shell that also runs `next build` or `next start`.**
`.env` intentionally does not set `NODE_ENV` — Next.js sets it itself per command
(`development` for `next dev`, `production` for `next build`/`next start`). If your shell
already has `NODE_ENV` exported to something else when Next runs, the build becomes
internally inconsistent — during development of this project that produced a build-time
crash (`<Html> should not be imported outside of pages/_document`) that had nothing to do
with the actual code and everything to do with a stale `NODE_ENV=development` in the
build's environment. If you need `DATABASE_URL` etc. in your shell for a one-off command,
either source `.env` in a fresh shell that doesn't otherwise touch `NODE_ENV`, or export
the specific variables you need instead of the whole file.

Note: `turbo.json` sets `"envMode": "loose"` so `pnpm build`/`pnpm dev` at the repo root
pass your shell's environment variables through to Turborepo's tasks — Turborepo's
default "strict" mode otherwise silently drops everything except an explicit allowlist,
which surfaces as a confusing `DATABASE_URL is not set` failure deep in Next's build.

## Common commands

```
pnpm dev                 # all apps in dev mode (turbo)
pnpm build                # production build, all apps
pnpm test                 # unit tests, all packages
pnpm --filter web test:e2e   # Playwright e2e (needs a running build — see docs/TESTING.md)
pnpm typecheck             # tsc --noEmit, all packages
pnpm lint                  # ESLint (apps/web)
pnpm db:generate            # regenerate migrations after a schema change
pnpm db:migrate             # apply migrations
pnpm db:studio              # Drizzle Studio (inspect data)
```

## Local infrastructure ports

Postgres runs on host port **5433** (not 5432) specifically to avoid colliding with a
Postgres instance already running natively on many dev machines — see the comment in
`docker-compose.yml`. MinIO console is at `http://localhost:9001` (credentials in
`.env.example`).

## Monorepo conventions

- New shared logic that has no framework dependency → `packages/shared`.
- New cross-module type/schema → `packages/contracts`.
- New domain behavior (permissions, page ops, sharing, etc.) → a directory under
  `apps/web/src/server/<domain>/`, wrapped by a `"use server"` action in
  `apps/web/src/app/(app)/actions/<domain>.ts`. See `docs/ARCHITECTURE.md`.
- Never import `@notion-clone/database` from a React component — domain modules are
  `import "server-only"` for a reason.

## Editor development

`packages/editor` is framework-agnostic React (no Next.js dependency) so it could in
principle be reused outside this app. New block types go in `packages/editor/src/nodes/`;
register them in `packages/editor/src/kit.ts`'s `createExtensions`. If a block needs
server interaction (uploads, page creation, link metadata), add it to
`packages/editor/src/types.ts`'s service interfaces and wire the real implementation from
`apps/web/src/components/page/` — the editor package itself never imports server actions
directly.
