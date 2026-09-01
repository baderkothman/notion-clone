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

## Not done — largest remaining gaps

- [ ] **apps/realtime**: Hocuspocus server + editor Yjs wiring + presence. Architecture
      documented in `docs/ARCHITECTURE.md`; dependencies installed
      (`@tiptap/extension-collaboration`, `y-prosemirror`, `yjs`); no implementation.
- [ ] Database Calendar view + filter/sort UI (Table/Board/List are done — see above).
- [ ] Public sharing of database-type pages.
- [ ] Block-scoped comment anchoring UI (schema supports `blockId`; composer is
      page-level only), @mention autocomplete.
- [ ] Transactional email delivery (invitations, password reset currently log to server
      console in dev).
- [ ] Integration test suite against real Postgres (permission enforcement, hierarchy
      operations) beyond what e2e covers indirectly.
- [ ] Automated accessibility audit (axe/Lighthouse).

## Notes for whoever continues this

- Read `docs/DEVELOPMENT.md`'s NODE_ENV warning before running `next build` manually —
  it cost significant time to diagnose during this session.
- Postgres runs on host port **5433**, not 5432 (collision avoidance — see
  `docker-compose.yml`).
- The permission-resolution core (`resolve-core.ts`) is pure and unit-tested; extend its
  tests before extending its logic.
