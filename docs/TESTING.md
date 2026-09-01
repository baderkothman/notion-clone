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
Postgres + MinIO stack. 8 tests, all passing:

- `core-flow.spec.ts`: sign up → create workspace → create a page → type in the editor →
  autosave reaches "Saved" → sign out → sign back in → title and content persisted.
  Also: unauthenticated visitors are redirected to sign-in, and a failed sign-in does not
  clear the form fields (regression guard — see docs/ARCHITECTURE.md-adjacent history in
  `tasks/todo.md` for what this caught).
- `authorization.spec.ts`: the security-critical negative case — two independent
  accounts/workspaces; user B cannot open user A's private page by URL, and its title/
  content never appear in user B's response.
- `database.spec.ts`: create a database, add a property, add a row, set its title and a
  Select value (creating a new option inline), switch to Board view grouped by that
  property, confirm the row lands in the right column.
- `public-share.spec.ts`: enable "Share to web", copy the link, an anonymous visitor
  (no session) can view the page read-only; a page never made public still redirects an
  anonymous visitor to sign-in.
- `workspace-settings.spec.ts`: rename a workspace (with slug-change redirect); invite a
  member, see the pending invitation, revoke it.

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

Covered end-to-end and passing: sign up/in/out, workspace creation, rename, and member
invite/role/removal; nested page creation via the sidebar and editor slash command; block
editing with autosave and conflict detection; cross-workspace authorization denial;
Notion-style database creation with Table/Board views; public page sharing.

Not covered by an automated test in this pass (manually exercised during development,
but not asserted in CI): drag-and-drop reordering, duplicate/favorite/trash/restore
flows, comments, page history/restore, search, file upload, dark/light theme toggle, and
responsive/mobile layout. The full invite → sign-up → accept cross-account loop was
verified manually (see `tasks/todo.md`) but isn't a permanent test, since it depends on
reading a dev-only console-logged invite token — a stand-in for real email delivery, not
something a CI runner can portably do. See `docs/NOTION_PARITY.md` for which features are
fully built vs. partial.

## Definition of done (per increment)

Before considering a slice finished: `pnpm -r typecheck`, `pnpm --filter web lint`,
`pnpm -r test`, `pnpm --filter web build` all succeed, and the relevant flow was verified
against a running dev/prod build (not just "the build succeeded").

## CI

`.github/workflows/ci.yml` runs on every push to `main` and every PR: a fast
`lint-typecheck-test` job (no infrastructure needed), then an `e2e` job with Postgres and
MinIO as GitHub Actions service containers, building the app and running the full
Playwright suite against it. The workflow file's YAML has been syntax- and
structure-validated, but **has not been run on an actual GitHub Actions runner** — this
repository has no configured git remote in this environment. Before relying on it,
push to a real GitHub repo and confirm the `e2e` job's service-container health checks
and `wait-on` step behave as expected on GH's runners (timing/networking specifics can
differ from local Docker).
