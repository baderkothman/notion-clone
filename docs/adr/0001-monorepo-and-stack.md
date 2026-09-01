# ADR 0001: Monorepo structure and core stack

## Status
Accepted

## Context
Phase 1 needs a maintainable foundation for a large surface area (auth, workspaces,
pages, a real editor, realtime, sharing, comments, search, databases, files, history)
that stays navigable as it grows and that a future differentiating-features phase can
build on without a rewrite.

## Decision
- Turborepo + pnpm workspaces, with domain logic separated from framework code:
  `packages/contracts` (schemas/types, no framework dependency), `packages/database`
  (Drizzle schema + client), `packages/auth` (Auth.js config, isolated), `packages/editor`
  (Tiptap, framework-agnostic React), `packages/ui` (design tokens + components),
  `packages/shared` (cross-cutting utilities). `apps/web` composes these; `apps/realtime`
  hosts the Yjs collaboration server as a separate long-lived process.
- Next.js 15 (App Router) + React 19 + TypeScript strict + Tailwind v4.
- PostgreSQL + Drizzle ORM over a heavier ORM (Prisma) — Drizzle's schema is plain
  TypeScript (no separate DSL/codegen step to keep in sync), and its SQL-shaped query
  builder makes the recursive CTEs this app relies on (permission resolution, page
  hierarchy, cycle detection) straightforward to write and read.

## Consequences
- Every workspace package needs its own `package.json`/`tsconfig.json` — more
  boilerplate per package than a flat `src/` tree, in exchange for enforced module
  boundaries (a UI component literally cannot import the database client; TypeScript's
  module resolution won't find it without the dependency being declared).
- Turborepo's task graph means `pnpm build`/`pnpm test` naturally respect package
  dependency order without hand-written orchestration.
