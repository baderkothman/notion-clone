# Notion Clone

A production-quality, self-hosted workspace for notes, docs, and collaboration — pages,
nested hierarchy, a real block editor, sharing/permissions, comments, search, and
Notion-style databases. Built as a Turborepo monorepo with Next.js 15, PostgreSQL/Drizzle,
Tiptap, and Auth.js.

This is **Phase 1**: the Notion-clone foundation only. See "Future Product Extensions" in
`docs/ARCHITECTURE.md` — intentionally left empty; differentiating features are a
separate, later phase.

## Quick start

```bash
pnpm install
cp .env.example .env
# openssl rand -base64 32   → paste into AUTH_SECRET and REALTIME_JWT_SECRET
docker compose up -d
pnpm db:migrate
pnpm dev
```

Open http://localhost:3000, sign up, and create a workspace. See `docs/DEVELOPMENT.md`
for the full setup guide — **read its NODE_ENV warning before running `next build`
manually**.

## Documentation

- [`docs/PRODUCT_SPEC.md`](docs/PRODUCT_SPEC.md) — objective, stack, conventions, boundaries
- [`docs/NOTION_PARITY.md`](docs/NOTION_PARITY.md) — feature-by-feature status, honestly tracked
- [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) — module boundaries and why they're shaped this way
- [`docs/DATABASE.md`](docs/DATABASE.md) — schema, key design decisions, indexing
- [`docs/SECURITY.md`](docs/SECURITY.md) — authorization model, threat coverage, known gaps
- [`docs/TESTING.md`](docs/TESTING.md) — what's tested, how to run it, what isn't yet
- [`docs/DEVELOPMENT.md`](docs/DEVELOPMENT.md) — local setup, commands, conventions
- [`docs/adr/`](docs/adr/) — architecture decision records

## Project structure

```
apps/
  web/            Next.js app — routes, server actions, UI
  realtime/       Yjs/Hocuspocus collaboration server (designed, not yet implemented)
packages/
  contracts/      Zod schemas + shared types
  database/       Drizzle schema, migrations, client
  auth/           Auth.js config, password hashing
  editor/         Tiptap extensions, slash menu, autosave hook
  ui/             Design tokens + shared components
  shared/         ids, errors, Result, rate limiting, sort keys
```

## Status

Core flows are implemented and verified end-to-end (see `docs/NOTION_PARITY.md` for the
full matrix and `docs/TESTING.md` for what's actually asserted by tests): auth,
workspaces, nested pages with drag-and-drop, a real block editor with 15+ block types,
autosave with conflict detection, sharing/permissions, comments, search, file uploads,
and page history. Real-time collaboration (Yjs/Hocuspocus) and the database view UI
(Table/Board/List/Calendar) are designed and schema-complete but not yet implemented —
see `docs/NOTION_PARITY.md` for specifics.
