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

## Not done — largest remaining gaps

- [ ] **apps/realtime**: Hocuspocus server + editor Yjs wiring + presence. Architecture
      documented in `docs/ARCHITECTURE.md`; dependencies installed
      (`@tiptap/extension-collaboration`, `y-prosemirror`, `yjs`); no implementation.
- [ ] **Database view UI**: Table/Board/List/Calendar. Backend (properties, rows, views,
      server actions) is complete and typed; no page to create a database or render any
      view.
- [ ] Public share viewer route (`/share/[token]`) — read-only, unauthenticated render of
      a page with `publicShareEnabled`.
- [ ] Workspace settings pages (general settings, member management list UI — domain
      functions exist, routes are stubs or missing).
- [ ] Comment threading/replies UI, block-scoped comment anchoring UI, @mention
      autocomplete.
- [ ] Transactional email delivery (invitations, password reset currently log to server
      console in dev).
- [ ] Integration test suite against real Postgres (permission enforcement, hierarchy
      operations) beyond what e2e covers indirectly.
- [ ] CI pipeline (GitHub Actions or equivalent) running typecheck/lint/test/build/e2e.
- [ ] Automated accessibility audit (axe/Lighthouse).
- [ ] History snapshot pruning job (policy documented, not scheduled).

## Notes for whoever continues this

- Read `docs/DEVELOPMENT.md`'s NODE_ENV warning before running `next build` manually —
  it cost significant time to diagnose during this session.
- Postgres runs on host port **5433**, not 5432 (collision avoidance — see
  `docker-compose.yml`).
- The permission-resolution core (`resolve-core.ts`) is pure and unit-tested; extend its
  tests before extending its logic.
