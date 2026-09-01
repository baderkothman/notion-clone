# Product Spec: Notion Clone — Phase 1

## Objective

Build a production-quality, multi-tenant Notion clone: workspaces, nested pages, a real
block editor, real-time collaboration, comments, search, Notion-style databases, secure
file handling, sharing/permissions, and page history. This is the foundation phase only —
no differentiating features beyond Notion parity. See "Future Product Extensions" at the
end of `docs/ARCHITECTURE.md` for the (intentionally empty) placeholder for phase 2.

Users: knowledge workers organized into workspaces (teams), each with owners/admins/
members/guests. Success = a user can sign up, create a workspace, build a nested page
tree with a genuinely usable block editor, collaborate live with a teammate, share pages
with fine-grained permissions, search their content, and trust that another workspace can
never see their data.

## Tech Stack

- Monorepo: Turborepo + pnpm workspaces, TypeScript 5 strict everywhere
- Web app: Next.js 15 (App Router), React 19
- Styling: Tailwind CSS v4 + local `packages/ui` component library (Radix primitives)
- Database: PostgreSQL 16 + Drizzle ORM (`drizzle-kit` migrations, committed to git)
- Auth: Auth.js v5 (Credentials provider, bcrypt, DB session strategy, our own schema)
- Editor: Tiptap 2 (ProseMirror) with custom Notion-style block extensions
- Real-time: Yjs CRDT + Hocuspocus server (`apps/realtime`), `onAuthenticate` hook enforces
  workspace/page permission per connection — a page ID alone never grants room access
- Storage: S3-compatible object storage (MinIO locally, S3-compatible in prod) via
  presigned URLs, abstracted behind `packages/database`'s files module
- Search: PostgreSQL `tsvector`/`ts_rank` behind a `SearchProvider` interface
- Validation: Zod schemas in `packages/contracts`, enforced at every server boundary
- Testing: Vitest (unit/integration), Playwright (e2e)
- Rate limiting: token-bucket in Postgres/Redis-free for phase 1 (Redis added only if a
  concrete need — horizontal scaling of realtime presence — appears)

## Commands

```
Install:      pnpm install
Dev (all):    pnpm dev
Dev (web):    pnpm --filter web dev
DB up:        docker compose up -d
Migrate:      pnpm --filter @notion-clone/database db:migrate
Studio:       pnpm --filter @notion-clone/database db:studio
Build:        pnpm build
Unit/int test: pnpm test
E2E test:     pnpm --filter web test:e2e
Typecheck:    pnpm typecheck
Lint:         pnpm lint
```

## Project Structure

```
apps/
  web/            Next.js app — routes, server actions, UI composition
  realtime/        Hocuspocus WS server for collaborative editing
packages/
  contracts/       Zod schemas + shared types — the cross-module contract surface
  database/        Drizzle schema, migrations, typed query modules per domain
  auth/            Auth.js config, session helpers, password hashing — isolated & swappable
  editor/           Tiptap extensions, block schema, slash menu, toolbar
  ui/               Design tokens + shared React components (buttons, menus, dialogs)
  config/           Shared eslint/tsconfig/tailwind config
  shared/           Cross-cutting utilities (ids, dates, result types)
docs/               PRODUCT_SPEC, NOTION_PARITY, ARCHITECTURE, DATABASE, SECURITY,
                    TESTING, DEVELOPMENT, adr/
tasks/              capability-map.md, plan.md, todo.md
```

## Code Style

- No default exports for components (`export function PageIcon(...)`).
- Server-only domain logic under `apps/web/src/server/<module>/*`; never imported by
  client components (enforced via `import "server-only"`).
- Every server action/route validates its input with a Zod schema from `packages/contracts`
  before touching the database — types alone are not validation.
- Authorization is a function, not a query filter bolted on later:
  `assertCanEditPage(session, pageId)` throws `ForbiddenError`; callers never inline
  role checks.

```ts
// apps/web/src/server/pages/update-title.ts
import "server-only";
import { z } from "zod";
import { assertPagePermission } from "@/server/permissions";
import { db, pages } from "@notion-clone/database";

const Input = z.object({ pageId: z.string().uuid(), title: z.string().max(2000) });

export async function updatePageTitle(sessionUserId: string, raw: unknown) {
  const { pageId, title } = Input.parse(raw);
  await assertPagePermission(sessionUserId, pageId, "edit");
  await db.update(pages).set({ title, updatedAt: new Date() }).where(eq(pages.id, pageId));
}
```

## Testing Strategy

- Unit: permission logic, hierarchy operations (move/cycle-prevention), filters/sorts,
  Zod schemas — `packages/*/src/**/*.test.ts`, Vitest.
- Integration: real Postgres (docker) — permission enforcement, page CRUD, sharing,
  search ranking, file authorization — `apps/web/src/server/**/*.int.test.ts`.
- E2E: Playwright against a running dev stack — the 18 flows listed in the top-level
  instructions, under `apps/web/e2e/*.spec.ts`. Security-critical flows always include a
  negative case (cross-workspace access attempt, guest write attempt).

## Boundaries

- **Always:** validate every server boundary with Zod; check authorization server-side on
  every mutation and query; write a migration for every schema change; keep secrets out of
  git; run typecheck+lint+unit before considering a slice done.
- **Ask first:** adding a new top-level dependency category (e.g. a message queue), any
  data-destructive migration, changing the auth strategy.
- **Never:** trust a client-supplied workspace/page ID without server-side ownership
  checks; render stored HTML/rich text without sanitization; store secrets in the repo;
  put business logic in React components; disable lint/type errors to unblock a build.

## Success Criteria

The Stop Conditions list in the top-level instructions is the authoritative acceptance
list for Phase 1. `docs/NOTION_PARITY.md` tracks feature-by-feature implementation status.

## Open Questions / Assumptions Log

- Auth: email/password via Credentials provider (no OAuth providers in phase 1 — can be
  added later without touching domain logic, since `packages/auth` isolates the strategy).
- Redis: not introduced until a concrete scaling need appears (realtime presence fan-out
  across multiple server instances). Single-instance Hocuspocus is sufficient for phase 1.
- Calendar database view: included as "practical within this phase" per instructions;
  simpler than full recurring-event support.
