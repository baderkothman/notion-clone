# Testing

## Levels

**Unit** (Vitest, `packages/*/src/**/*.test.ts` and `apps/web/src/**/*.test.ts`) — pure
logic only, no database or network: permission resolution (`resolve-core.test.ts`, 9
cases covering creator-owns, private-denies, explicit-share, inheritance, workspace
visibility, guest exclusion, and precedence ordering), history-revision pruning,
database filter/sort (`filter-sort-core.test.ts`, 8 operators plus multi-column sort with
empties sorting last regardless of direction), email template rendering, fractional
sort-key ordering, domain error shapes, the in-memory rate limiter, password hashing, and
Zod schema validation (auth, permission role exclusions). 46 tests, all passing:

```
pnpm -r test
```

**End-to-end** (Playwright, `apps/web/e2e/*.spec.ts`) — real browser against a real
Postgres + MinIO stack. 17 tests, all passing:

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
- `database-calendar-and-filters.spec.ts`: switch to Calendar view, pick a Date property,
  confirm a row lands on the right day; add a Filter condition and confirm it hides
  non-matching rows.
- `public-share.spec.ts`: enable "Share to web", copy the link, an anonymous visitor
  (no session) can view the page read-only; a page never made public still redirects an
  anonymous visitor to sign-in.
- `public-database-share.spec.ts`: the same public-share flow for a database-type page —
  an anonymous visitor sees the dedicated read-only table renderer, not the interactive
  one merely disabled.
- `comments.spec.ts`: page-level comments — create, reply (threading), resolve, delete.
- `block-comments-and-mentions.spec.ts`: block-scoped comments opened from the editor
  gutter's comment icon, and @mention autocomplete in the composer.
- `workspace-settings.spec.ts`: rename a workspace (with slug-change redirect); invite a
  member, see the pending invitation, revoke it.
- `realtime-collaboration.spec.ts`: two independent accounts, shared for "edit" access,
  both connect to apps/realtime's Hocuspocus room for the same page; one types, the
  other sees it appear live (not merely "after autosave" — Yjs updates broadcast through
  the room directly); presence shows each other's avatar. Requires apps/realtime running
  alongside the web app (see `apps/realtime`'s own dev/start command) — this is the one
  spec in the suite with that extra requirement, and CI's `e2e` job starts it before
  running Playwright (see the CI section below). Found and fixed two real bugs while
  building this feature (see docs/ARCHITECTURE.md's realtime section for the details):
  mounting the editor on an unsynced Y.Doc (silently editable, would overwrite real
  content on save) and suppressing autosave for a `"connecting"` status that could persist
  forever if apps/realtime was unreachable — both manually verified fixed by killing
  apps/realtime mid-test and confirming the editor falls back to plain autosave and
  content still survives a reload; that specific scenario isn't itself a permanent CI
  test, since it needs apps/realtime configured-but-unreachable while every other spec in
  the same run needs it configured-and-reachable — not something one CI job's single
  server instance can do for just one spec.
- `accessibility.spec.ts`: automated axe-core audit (WCAG 2.0/2.1 A + AA rule set) of the
  auth forms, the workspace shell, the page editor, a database table, and workspace
  settings — asserts zero automatically detectable violations. Caught and fixed a real
  bug in this pass: Tiptap's `BubbleMenu` and slash-menu both use Tippy.js popups that, by
  default, write `aria-expanded` onto their reference element regardless of whether its
  ARIA role permits that attribute — for the slash menu, the reference was
  `document.body` itself. Fixed with Tippy's `aria: { expanded: false }` option in both
  places (`selection-toolbar.tsx`, `slash-command.ts`).

```
docker compose up -d
pnpm db:migrate
pnpm --filter web build
pnpm --filter web exec next start -p 3000 &      # needs DATABASE_URL etc. in the shell —
                                                   # see docs/DEVELOPMENT.md's NODE_ENV warning
pnpm --filter realtime start &                    # needed for realtime-collaboration.spec.ts;
                                                   # every other spec runs fine without it
pnpm --filter web exec playwright test
```

**Integration** (Vitest, `apps/web/src/**/*.int.test.ts`, real Postgres, no HTTP/browser
layer) — a separate suite from the unit tests above, run with a dedicated config
(`vitest.integration.config.ts`) that only picks up `*.int.test.ts` files and aliases the
`server-only` package to a no-op shim (`apps/web/test/server-only-shim.ts`) so the real
domain modules can be imported directly under plain Node/Vitest instead of only via
Next.js's webpack build. 10 tests, all passing:

```
pnpm test:integration     # needs DATABASE_URL etc. in the shell, same as db:migrate
```

- `permissions/resolve.int.test.ts` (6 tests): the recursive-CTE permission walk in
  `resolve.ts` against real nested pages and real shares — creator-owns-private,
  member-denied-without-a-share, outsider-denied-but-workspace-still-identified,
  explicit-share-inherited-by-a-child-page, workspace-visibility grants members but not
  guests, and nearest-ancestor-share-wins-over-a-farther-stronger-one.
- `pages/hierarchy.int.test.ts` (4 tests): `move.ts`'s cycle prevention (rejects moving a
  page into its own descendant or into itself, and confirms the tree is unchanged after a
  rejected move), a legitimate move, and `duplicate.ts`'s recursive subtree clone
  (nested children and grandchildren all cloned as new pages under the new parent, with
  the original subtree left untouched).

The regular unit-test config (`vitest.config.ts`) explicitly excludes `*.int.test.ts`, so
`pnpm -r test` stays fast and DB-free; CI runs `pnpm test:integration` as its own step in
the `e2e` job (after migrations, before the build), so a broken recursive query or cycle
check fails CI even if no e2e spec happens to exercise that exact path.

## What's covered vs. not, honestly

Covered end-to-end and passing: sign up/in/out, workspace creation, rename, and member
invite/role/removal; nested page creation via the sidebar and editor slash command; block
editing with autosave and conflict detection; cross-workspace authorization denial;
Notion-style database creation with Table/Board/Calendar views plus filters; page-level
and block-scoped comments with @mentions; public sharing of both document and database
pages; live multi-user collaborative editing with presence; an automated accessibility
(axe-core) sweep; and, at the integration level, the recursive permission-CTE and
page-hierarchy operations against real Postgres.

Not covered by an automated test in this pass (manually exercised during development,
but not asserted in CI): drag-and-drop reordering, favorite/trash/restore flows, page
history/restore, search, file upload, dark/light theme toggle, and responsive/mobile
layout. The full invite → sign-up → accept cross-account loop was verified manually (see
`tasks/todo.md`) but isn't a permanent test, since it depends on reading a dev-only
console-logged invite token — a stand-in for real email delivery on an account without a
verified sending domain, not something a CI runner can portably do. See
`docs/NOTION_PARITY.md` for which features are fully built vs. partial.

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
