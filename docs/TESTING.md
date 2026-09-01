# Testing

## Levels

**Unit** (Vitest, `packages/*/src/**/*.test.ts` and `apps/web/src/**/*.test.ts`) — pure
logic only, no database or network: permission resolution (`resolve-core.test.ts`, 9
cases covering creator-owns, private-denies, explicit-share, inheritance, workspace
visibility, guest exclusion, and precedence ordering), fractional sort-key ordering,
domain error shapes, the in-memory rate limiter, password hashing, and Zod schema
validation (auth, permission role exclusions). 30 tests, all passing:

```
pnpm -r test
```

**End-to-end** (Playwright, `apps/web/e2e/*.spec.ts`) — real browser against a real
Postgres + MinIO stack:

- `core-flow.spec.ts`: sign up → create workspace → create a page → type in the editor →
  autosave reaches "Saved" → sign out → sign back in → title and content persisted.
  Also: unauthenticated visitors are redirected to sign-in.
- `authorization.spec.ts`: the security-critical negative case — two independent
  accounts/workspaces; user B cannot open user A's private page by URL, and its title/
  content never appear in user B's response.

```
docker compose up -d
pnpm db:migrate
pnpm --filter web build
pnpm --filter web exec next start -p 3000 &      # needs DATABASE_URL etc. in the shell —
                                                   # see docs/DEVELOPMENT.md's NODE_ENV warning
pnpm --filter web exec playwright test
```

**Integration** (permission enforcement against a real database, page CRUD, sharing,
search ranking, file authorization) — the domain modules under `apps/web/src/server/`
are structured for this (pure input → real DB → assert), but a dedicated
`*.int.test.ts` suite wasn't written in this pass beyond what the e2e tests exercise
indirectly. This is the most valuable next testing investment: it would directly cover
`resolve.ts`'s recursive CTE, `move.ts`'s cycle prevention, and `duplicate.ts`'s
recursive clone against real data instead of only through the UI.

## What's covered vs. not, honestly

Covered end-to-end and passing: sign up, sign in, sign out, workspace creation, page
creation, block editing, autosave with persistence, cross-workspace authorization denial.

Not covered by an automated test in this pass (manually exercised during development,
but not asserted in CI): nested page creation depth >1, drag-and-drop reordering,
duplicate/favorite/trash/restore flows, sharing dialog, comments, page history/restore,
search, file upload, dark/light theme toggle, and responsive/mobile layout. See
`docs/NOTION_PARITY.md` for which of these are even fully built vs. partial.

## Definition of done (per increment)

Before considering a slice finished: `pnpm -r typecheck`, `pnpm --filter web lint`,
`pnpm -r test`, `pnpm --filter web build` all succeed, and the relevant flow was verified
against a running dev/prod build (not just "the build succeeded").

## CI

Not set up in this pass — no `.github/workflows/` pipeline exists yet. The commands
above are exactly what a CI job would run; wiring them into GitHub Actions (or
equivalent) is a natural next step, gated on provisioning a CI-side Postgres/MinIO
service for the e2e job.
