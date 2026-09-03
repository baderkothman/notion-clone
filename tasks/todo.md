# Todo — Phase 1 Notion Clone

Status as of this session. Check `docs/NOTION_PARITY.md` for full detail per feature.

## Done (verified: typecheck + lint + unit tests + e2e all passing)

- [x] identity: sign up/in/out, JWT sessions, password reset (token flow; email delivery
      logs to console — no provider wired)
- [x] workspaces: create/switch, roles, invitations + accept-invitation page, member
      role/removal domain logic
- [x] pages: CRUD, nested hierarchy, drag-and-drop reorder/reparent, duplicate, favorite,
      trash/restore/permanent-delete, breadcrumbs
- [x] blocks: Tiptap editor — 15+ block types, slash menu, drag handles, floating
      formatting toolbar, markdown shortcuts
- [x] autosave: debounced, optimistic-concurrency conflict detection, visible status
- [x] sharing: private/workspace visibility, explicit per-user shares with inheritance,
      guests, public-share token (no public viewer route yet)
- [x] comments: page-level create/resolve/delete (block-scoped UI and threading UI
      pending — schema supports both)
- [x] search: Postgres full-text, ⌘K command menu
- [x] files: presigned S3 upload/download, SSRF-guarded bookmark embeds
- [x] history: automatic snapshots, view + restore

## Fixed after initial delivery

- [x] Sign-up validation errors showed a generic, unhelpful message (Zod errors weren't
      translated) — fixed in `(auth)/actions.ts`'s `messageFor`.
- [x] Auth forms (sign-up/sign-in/forgot-password/reset-password) wiped all fields on
      any failed submission — they were uncontrolled `<form action={...}>` elements, and
      React/the browser reset uncontrolled fields after a `useActionState` action
      completes even without a redirect. Fixed by making the fields controlled. Guarded
      by `e2e/core-flow.spec.ts`'s "a failed sign-in does not clear the form".
- [x] The sidebar's page tree didn't refresh after creating a top-level page/database
      from anywhere except its own lazy-expand fetch — `PageTree` owned its root list in
      `useState(initialItems)`, which only reads its argument once. Fixed with a
      `refreshKey` prop plus a `SidebarRefreshProvider` context so any creation entry
      point (sidebar "New" menu, workspace empty-state button) can signal a re-fetch.

## Done this session: Database view UI

- [x] Create a database (sidebar "New" → Database), Table/Board/List views, full
      property-type editing (text/number/checkbox/url/date/select/multi_select/status/
      person/files), inline option creation, board grouping. E2E-verified
      (`e2e/database.spec.ts`). Calendar view and filter/sort UI are still not built —
      see `docs/NOTION_PARITY.md`'s Databases section for the itemized breakdown.

## Done this session: public share viewer

- [x] `/share/[token]` — read-only, unauthenticated render of a page with
      `publicShareEnabled`. E2E-verified (`e2e/public-share.spec.ts`): toggle on, copy
      link, an anonymous visitor can view it; a page never made public still 404s for
      that same visitor. Database-type pages are intentionally out of scope for public
      sharing in this pass (see the route's comment).

## Done this session: workspace settings

- [x] `/w/[slug]/settings` (general: name/icon/URL, slug-change redirect) and
      `/w/[slug]/settings/members` (list, invite, role change, removal, pending
      invitations, revoke). New domain functions: `updateWorkspace`, `revokeInvitation`,
      `listPendingInvitations`. E2E-verified (`e2e/workspace-settings.spec.ts`: rename +
      slug redirect, invite → pending → revoke) plus a full manual pass of invite → sign
      up → accept → membership (not a permanent test — depends on reading the dev-only
      console-logged invite token, not something a CI runner can portably do; see
      `server/workspaces/members.ts`).

## Done this session: CI pipeline

- [x] `.github/workflows/ci.yml` — lint/typecheck/unit-test job, then an e2e job with
      Postgres + MinIO service containers. YAML syntax/structure validated; **not run on
      an actual GitHub Actions runner** (no git remote configured in this environment —
      see `docs/TESTING.md`'s CI section for what to double-check on first real run).

## Done this session: history snapshot pruning

- [x] `prune-revisions.ts`/`prune-revisions-core.ts` — runs opportunistically after each
      new snapshot (no cron/scheduler needed), thinning to one-per-hour beyond 24h and
      one-per-day beyond 30 days. Bucketing logic is pure and unit-tested (5 cases).

## Done this session: comment threading UI

- [x] Reply to a comment (indented thread), resolve/reopen hides the whole thread by
      default, delete a reply without affecting its parent. E2E-verified
      (`e2e/comments.spec.ts`).

## Done this session: database Calendar view, filters/sorts, and public database sharing

- [x] Calendar view (month grid, pick a Date property, prev/next/today) and per-view
      Filter (8 operators)/Sort (multi-column, empties-last) controls, applied
      client-side over already-loaded rows. Pure logic unit-tested (9 cases:
      `filter-sort-core.test.ts`); e2e-verified (`e2e/database-calendar-and-filters.spec.ts`).
- [x] Public sharing of database-type pages (`/share/[token]` now handles
      `page.type === "database"`) — a dedicated read-only table renderer
      (`public-database-view.tsx`), not the interactive `TableView` merely disabled: its
      per-cell inputs don't gate on `editable`, so reusing it would show controls that
      look interactive but silently no-op for a sessionless visitor — exactly the "fake
      button" this project's quality bar rules out. E2E-verified
      (`e2e/public-database-share.spec.ts`).

## Not done — largest remaining gaps

Nothing left in this list — the last remaining item (real-time collaboration, below) is
now done. See `docs/NOTION_PARITY.md` for the handful of smaller partial/deferred items
(cover-image direct upload, a dedicated "Shared with me" sidebar section, full manual
WCAG 2.2 AA audit beyond what axe catches automatically) that were never on this list to
begin with because they were scoped as partial from the start.

## Done this session: real-time collaboration (apps/realtime)

- [x] `apps/realtime`: a Hocuspocus (Yjs) WebSocket server as its own Node process.
      `onAuthenticate` verifies a short-lived JWT minted by `apps/web` only after a real
      `assertPagePermission(userId, pageId, "edit")` check (`server/realtime/mint-token.ts`)
      — joining a room by URL/page-id alone is refused. `onLoadDocument`/`onStoreDocument`
      convert between Yjs and the same `documents.content` Tiptap-JSON shape the plain
      autosave path uses via `@hocuspocus/transformer`, so both converge on one source of
      truth; `documents.version` is still bumped on every realtime write so a stale
      autosave from a client mid-reconnect correctly conflicts instead of clobbering.
- [x] Editor wiring: `packages/editor/src/use-collaboration.ts` owns the Y.Doc +
      HocuspocusProvider; `kit.ts` adds Tiptap's Collaboration/CollaborationCursor
      extensions (and disables StarterKit's plain history, since Collaboration brings its
      own Yjs-backed undo/redo) only when a collaboration config is passed in. Live
      cursors, selections, and a presence avatar stack in the page header
      (`collaboration-presence.tsx`) all come from Yjs awareness — no extra
      server-tracked "who's viewing" state.
- [x] **Two real bugs found and fixed while building this** (see docs/ARCHITECTURE.md's
      realtime section for the full writeup): (1) a fresh Y.Doc starts empty and is
      indistinguishable from "no content" until actually synced — mounting the editor on
      one before sync completed meant editing (and saving) an empty document, silently
      overwriting real content. Fixed by staying in plain mode (autosave-owned, reading
      `documents.content` normally) until `hasSyncedOnce` is true, with a bounded timeout
      that falls back to plain mode if sync never completes. (2) autosave was originally
      suppressed whenever collaboration was merely "enabled", including a `"connecting"`
      state that can persist forever if apps/realtime is unreachable — meaning typed
      content would never be saved anywhere. Fixed by only suppressing autosave while
      actually, provenly `"connected"` right now. Both fixes were verified manually by
      killing the realtime server mid-session and confirming autosave takes over and
      content survives a reload (not a permanent CI test — see docs/TESTING.md for why).
- [x] Custom Tiptap nodes (toggle, callout, child-page, image, file, bookmark) split into
      a plain `*-schema.ts` half (no React) and a `.tsx` half extending it with the node
      view, so apps/realtime can import the schema (`@notion-clone/editor/schema`) to
      losslessly convert custom blocks between Tiptap JSON and Yjs without pulling
      `react`/`react-dom` into a process that never renders anything.
- [x] E2E-verified (`e2e/realtime-collaboration.spec.ts`): two independent accounts,
      shared for edit access, both connect to the same page's room; one types, the other
      sees it live; presence shows each other's avatar. Wired into CI: the `e2e` job now
      also starts apps/realtime (`pnpm --filter realtime start`) alongside the web app.

## Done this session: automated accessibility audit

- [x] `e2e/accessibility.spec.ts` runs an axe-core sweep (WCAG 2.0/2.1 A + AA rules,
      `color-contrast` excluded — see the spec's comment for why) against the auth forms,
      workspace shell, page editor, a database table, and workspace settings; asserts
      zero violations on each. Runs as part of the existing Playwright suite, so it's
      already covered by CI's "Run e2e tests" step with no separate wiring needed.
- [x] **Found and fixed a real bug** while building this: Tiptap's `BubbleMenu`
      (selection toolbar) and the slash-menu both render via Tippy.js popups, which by
      default write `aria-expanded` onto their *reference* element regardless of whether
      its ARIA role permits that attribute — an `aria-allowed-attr` (critical) violation.
      For the selection toolbar the reference was the editor's own wrapper `<div>`; for
      the slash menu it was `document.body` itself, so every page with the editor mounted
      carried this on the single most global element in the DOM. Fixed in both places
      with Tippy's `aria: { expanded: false }` option (`selection-toolbar.tsx`,
      `slash-command.ts`) — the popups' own presence in the DOM already conveys
      open/closed state, so nothing else needed to change.

## Done this session: integration test suite against real Postgres

- [x] A separate Vitest config/suite (`vitest.integration.config.ts`,
      `apps/web/src/**/*.int.test.ts`) that imports the real domain modules (not just
      pure logic) against a real local Postgres, using a `server-only`-package shim
      (`test/server-only-shim.ts`) so those modules load under plain Node instead of only
      inside a Next.js webpack build. 10 tests: `permissions/resolve.int.test.ts` (6 —
      the recursive-CTE permission walk: creator-owns, member-denied, outsider-denied,
      explicit-share inherited by a child page, workspace-visibility excludes guests,
      nearest-ancestor-share wins) and `pages/hierarchy.int.test.ts` (4 — `move.ts`'s
      cycle prevention into a descendant/into itself with the tree left unchanged, a
      legitimate move, and `duplicate.ts`'s recursive subtree clone with nested
      grandchildren). Wired into CI as its own step in the `e2e` job, after migrations
      and before the build, so a broken recursive query fails CI even without an e2e
      spec exercising that exact path. `pnpm -r test` (unit) stays DB-free via an
      `exclude` on `*.int.test.ts`; run integration tests with `pnpm test:integration`.

## Done this session: block-scoped comments, @mentions, and a real drag-handle bug fix

- [x] Comment icon in the block hover gutter (`drag-handle.tsx`) opens the panel
      pre-targeted at that block; blocks with an open thread show a persistent
      right-margin badge (`comment-indicators.tsx`). @mention autocomplete in the
      composer (`mention-composer.tsx`) records explicit `mentionedUserIds` server-side
      rather than parsing "@Name" text. E2E-verified
      (`e2e/block-comments-and-mentions.spec.ts`).
- [x] **Found and fixed a real bug** while building this: the drag handle's gutter
      (insert-below, drag-to-move, and now comment) was silently non-functional under
      real mouse interaction — `element.click()` worked, but an actual pointer move
      followed by click did not. Two causes: (1) the hover-tracking listeners were
      attached to Tiptap's internal `EditorContent` wrapper div, one level too deep
      relative to where the gutter actually renders; (2) the `mousemove` handler cleared
      hover state the instant the pointer reached the gutter itself (not a
      `[data-block-id]` descendant), unmounting the gutter before a click could land.
      Fixed with an explicit container ref and by only clearing hover on true
      `mouseleave`. This had been broken since the editor was first built — no prior
      e2e test exercised a real hover+click on these buttons.

## Done this session: transactional email

- [x] Real delivery via Resend (`server/email/send-email.ts` + `templates.ts`), used by
      workspace invitations and password reset. No `RESEND_API_KEY` configured → falls
      back to the same console-log behavior as before (documented in `.env.example`),
      so local dev works either way. Unit-tested templates (2 tests); e2e suite already
      exercises the invite path end to end.

## Phase 2 — Differentiation: Calendar + Google Calendar sync + marketing site

Status as of this session. See `docs/NOTION_PARITY.md`'s "Phase 2: Differentiation"
table for the itemized feature list and `docs/ARCHITECTURE.md`'s "Calendar & Google
Calendar sync" for the architecture.

- [x] `calendar_events` + `google_calendar_connections` schema, two migrations
      (`0001_fearless_steve_rogers.sql`, `0002_goofy_penance.sql`), applied.
- [x] `packages/shared`: `encryptSecret`/`decryptSecret` (AES-256-GCM, 13 unit tests
      total incl. `crypto.test.ts`), `frequencyToRRule`/`rruleToFrequency` (5 unit
      tests, `recurrence.test.ts`).
- [x] `packages/contracts/src/calendar.ts`: create/update/delete/list event schemas,
      `selectGoogleCalendarSchema`, `GOOGLE_OAUTH_SCOPES`. Uses `z.date()` (not
      `z.string().datetime().pipe(z.coerce.date())`) deliberately — see the file's doc
      comment on why a `.pipe()` transform would split the exported input/output types
      in a way that mismatches what callers construct.
- [x] `ROLE_CAPABILITIES.useCalendar` (owner/admin/member: true, guest: false) — the
      single source of truth both the calendar page and the sidebar nav item check.
- [x] `apps/web/src/server/integrations/google-calendar/`: OAuth client, signed-state
      CSRF, connect/disconnect, token refresh-and-repersist, incremental pull sync
      (`syncToken`, 410-triggers-full-resync), local→Google push (create/update/delete,
      best-effort, never blocks the local write).
- [x] `apps/web/src/server/calendar/`: event CRUD domain functions, range-query
      listing. Workspace-scoped authorization via `useCalendar`, not per-event.
- [x] Routes: `/api/integrations/google/{authorize,callback}` (real GET handlers, not
      server actions — a top-level navigation to Google's consent screen can't happen
      from a fetch-based action). `/w/[slug]/settings/integrations` (connect/disconnect/
      sync-now/calendar-picker UI). `/w/[slug]/calendar` (Month/Week/Day/Agenda views,
      create/edit/delete dialog, drag-to-reschedule in Month view).
- [x] Sidebar: persistent "Calendar" nav item (top-level billing, not buried in Pages),
      hidden for guests.
- [x] **Found and fixed two real bugs while building this**: (1) the `next/font`
      CSS-variable scoping bug from the landing-page pass earlier this session (see
      that section) doesn't apply here, but a *related* bundling bug did — the first
      version of `event-dialog.tsx` (a client component) imported `rruleToFrequency`
      from `@notion-clone/shared`, whose barrel (`index.ts`) also re-exports
      `ids.ts`/`crypto.ts`, both of which import `node:crypto` — webpack can't bundle
      that into client code at all (`next build` failed with `UnhandledSchemeError`).
      Fixed by duplicating the ~8-line pure function locally in the client file rather
      than importing the package (documented in that file). (2) The Zod schema's
      exported "Input" types (`z.infer`) reflected the *parsed* (`Date`) shape, not what
      a client actually needs to *construct and pass in* — caught via `tsc`, not at
      runtime, before it shipped; fixed by using `z.date()` directly (see the contracts
      file's doc comment) instead of a string-to-Date `.pipe()` transform.
- [x] Verified: `pnpm typecheck` (8/8 packages), `pnpm lint` (clean), `pnpm -r test`
      (75/75 unit tests, up from 46 at the start of this session), `pnpm --filter web
      build` (clean; new routes: `/api/integrations/google/{authorize,callback}` ~131B
      each, `/w/[slug]/calendar` 8.34kB, `/w/[slug]/settings/integrations` 5.16kB).
- [ ] Not done: integration/e2e tests for the Google OAuth flow itself (needs a real or
      mocked Google account — no live Google test credentials exist in this
      environment) and for the calendar domain functions against real Postgres (the
      pure logic — date-range math, recurrence mapping, crypto round-trip — is
      unit-tested; the DB-touching domain functions follow the same patterns as
      `pages`/`comments`/etc. but don't yet have their own `.int.test.ts`). Manual
      verification of the connect→sync→disconnect flow against a real Google account
      also hasn't been done — needs real `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` (see
      `.env.example`), which don't exist in this environment either.
- [ ] Not done: pixel-accurate hour-by-hour time grid for Week/Day (shipped as
      day-grouped mini-agendas instead — a documented, deliberate scope cut, not an
      oversight; see `docs/ARCHITECTURE.md`).
- [ ] Not done: a broader app-wide UX/onboarding audit beyond the calendar feature
      itself and the new public marketing site — see the session's final report for
      exactly what was and wasn't reached.

## Notes for whoever continues this

- Read `docs/DEVELOPMENT.md`'s NODE_ENV warning before running `next build` manually —
  it cost significant time to diagnose during this session.
- Postgres runs on host port **5433**, not 5432 (collision avoidance — see
  `docker-compose.yml`).
- The permission-resolution core (`resolve-core.ts`) is pure and unit-tested; extend its
  tests before extending its logic.
- A client component must never import `@notion-clone/shared`'s barrel — `ids.ts` and
  `crypto.ts` both pull in `node:crypto`, which breaks the webpack client build. Import
  a specific pure submodule path if one exists, or duplicate the small pure function
  locally (see `event-dialog.tsx`'s `rruleToFrequency` for the precedent) — don't
  discover this the hard way again.
