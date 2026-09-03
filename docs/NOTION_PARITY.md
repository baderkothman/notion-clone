# Notion Parity Matrix

Status legend: ✅ implemented & e2e-verified · 🟡 backend/schema done, UI pending or partial · ⬜ not started.

## Identity & Sessions

| Feature | Clone behavior | Status |
|---|---|---|
| Sign up (email/password) | Credentials provider, bcrypt (cost 12), min 10-char password | ✅ |
| Sign in | Rate-limited (10/5min per email) | ✅ |
| Sign out | Server action, clears JWT cookie | ✅ |
| Persistent sessions | JWT cookie, httpOnly/sameSite=lax/secure-in-prod, 30-day maxAge | ✅ |
| Forgot/reset password | Token minted + hashed, 1h TTL, single-use; email delivery logs to console in dev (no provider wired — see Open Questions in PRODUCT_SPEC) | 🟡 |
| Protected routes | Edge middleware redirects unauthenticated requests; every server action independently re-checks | ✅ |
| Onboarding | First sign-up → `/onboarding` → create first workspace | ✅ |

## Workspaces

| Feature | Status |
|---|---|
| Create / switch workspace | ✅ |
| Workspace settings (rename/slug/icon) | ✅ `/w/[slug]/settings` — name, icon, URL/slug (with redirect on change) |
| Members list | ✅ `/w/[slug]/settings/members` — avatars, roles, "(you)" marker |
| Invitations (mint token, email-scoped, 7-day TTL) | ✅ invite form + pending-invitations list + revoke |
| Invite acceptance page (`/invite/[token]`) | ✅ e2e-verified full loop: invite → sign up → accept → membership |
| Roles: owner/admin/member/guest | ✅ enforced via `ROLE_CAPABILITIES`, role dropdown in members UI |
| Member role change / removal | ✅ domain + action + UI (owner role is not editable/removable) |
| Workspace deletion | ⬜ (owner-only capability flagged in `ROLE_CAPABILITIES`, no route yet) |

## Pages

| Feature | Status |
|---|---|
| Create / nested pages | ✅ |
| Title editing | ✅ auto-growing textarea, debounced save |
| Icon (emoji picker) | ✅ curated grid, not a full emoji library |
| Cover image | 🟡 external URL only (paste a link); direct upload deferred — see `page-cover.tsx` comment |
| Reorder / drag between parents | ✅ fractional-index sort keys, HTML5 DnD in the sidebar tree and in-editor drag handle |
| Duplicate page (recursive) | ✅ integration-tested against real Postgres, including nested grandchildren (`hierarchy.int.test.ts`) |
| Favorite / unfavorite | ✅ |
| Move to Trash / restore / permanent delete | ✅ cascades to descendants |
| Cycle prevention on move | ✅ integration-tested against real Postgres — `move.ts`'s `wouldCreateCycle` rejecting a move into a descendant/into itself, tree left unchanged (`hierarchy.int.test.ts`) |
| Breadcrumbs | ✅ recursive CTE |
| Sidebar sections (Favorites, Pages, Trash) | ✅ — **Recent** and a separate **Shared with me** section are not built (shares appear once navigated to directly; no dedicated "Shared" sidebar view yet) |

## Block Editor (Tiptap/ProseMirror)

| Block/feature | Status |
|---|---|
| Paragraph, H1–H3, bulleted/numbered list, to-do, quote, divider, code block, table | ✅ |
| Toggle (collapsible) | ✅ custom node |
| Callout | ✅ custom node, cyclable color |
| Child page block | ✅ creates a real page inline |
| Image | ✅ upload → S3 → signed URL fetched at render time |
| File attachment | ✅ same upload path |
| Bookmark / link embed | ✅ SSRF-guarded metadata fetch |
| Slash `/` menu | ✅ filtered, keyboard-navigable |
| Bold/italic/underline/strike/inline code/link | ✅ floating selection toolbar |
| Text color / highlight | ✅ 5-color palette each (not a full color picker) |
| Drag handle + block reordering | ✅ top-level blocks only — see "Known limitation" below |
| Duplicate / delete block | 🟡 delete via standard editor backspace/selection; no dedicated per-block menu button yet |
| Markdown shortcuts (`#`, `-`, `>`, `` ``` ``) | ✅ via Tiptap StarterKit input rules |
| Undo/redo | ✅ StarterKit history |
| Paste handling | ✅ Tiptap default HTML/text paste (schema-constrained, no raw HTML injection — see SECURITY.md) |

**Known limitation:** blocks nest structurally only where ProseMirror's schema already
nests (lists, table cells, toggle/callout content) — arbitrary indent-any-block-under-
any-block nesting (Notion's fully recursive block tree) is not implemented. This is the
single largest structural gap vs. real Notion; see `docs/ARCHITECTURE.md`.

## Autosave

| Feature | Status |
|---|---|
| Debounced save (800ms) | ✅ |
| Saving/saved/error/conflict states | ✅ visible indicator in the page header |
| Optimistic concurrency (version-checked writes) | ✅ `documents.version`, e2e-verified persistence across sign-out/sign-in |
| Save-before-unload guard | ✅ `beforeunload` handler while a save is pending |

## Real-Time Collaboration

| Feature | Status |
|---|---|
| `apps/realtime` server (Hocuspocus, token-authenticated rooms) | ✅ own Node process; `onAuthenticate` requires a short-lived JWT minted only after a real edit-permission check |
| Yjs wiring in the editor (`@tiptap/extension-collaboration`) | ✅ `packages/editor/src/use-collaboration.ts` + `kit.ts`; StarterKit's plain history is disabled in favor of Yjs-backed undo/redo when active |
| Presence / collaborator cursors | ✅ live cursors + selections (CollaborationCursor extension) and a header avatar stack, both from Yjs awareness |
| Falls back to plain autosave when unavailable | ✅ if apps/realtime isn't configured or reachable, the editor never mounts on an unsynced (and therefore misleadingly-empty) Y.Doc — it stays on the plain autosave path instead, bounded by a short timeout. See `docs/ARCHITECTURE.md`'s realtime section for the two real bugs this design fixes |
| E2E-verified | ✅ `e2e/realtime-collaboration.spec.ts` — two accounts, live propagation, presence |

Concurrent editing has two tiers now: while apps/realtime is reachable, edits merge live
via Yjs (no conflict prompts, real cursors); if it's unreachable, editing falls back to
the original optimistic-concurrency autosave path (safe, not live — a second editor sees
a "newer version available — reload" prompt instead).

## Comments

| Feature | Status |
|---|---|
| Page-level comments | ✅ |
| Block-scoped comments (`blockId`) | ✅ comment icon in the block hover gutter; right-margin badge on blocks with an open thread, e2e-verified |
| Threads/replies | ✅ reply inline, indented under the parent, e2e-verified (`e2e/comments.spec.ts`) |
| Resolve/reopen | ✅ resolving hides the whole thread by default; "Show resolved" reveals it |
| Mentions | ✅ `@name` autocomplete in the composer, explicit mentioned-user-ids recorded (not parsed from text), e2e-verified |
| Author identity, timestamps | ✅ |
| Permission-aware visibility | ✅ (comment requires `comment` role minimum) |

## Sharing & Permissions

| Feature | Status |
|---|---|
| Private / workspace-visible pages | ✅ |
| Explicit per-user shares (view/comment/edit) | ✅ |
| Inherited permissions from nearest shared ancestor | ✅ unit-tested (`resolve-core.test.ts`, the pure decision logic) and integration-tested against the real recursive-CTE walk in Postgres (`resolve.int.test.ts`, including nearest-ancestor-wins-over-a-stronger-farther-one) |
| Guests (page-scoped access without full membership) | ✅ sharing a page auto-creates a `guest` membership |
| Public "share to web" link | ✅ token-based; `/share/[token]` is a real unauthenticated read-only route, for both document pages and database-type pages (dedicated read-only table renderer, not the interactive `TableView` disabled) |
| Full/admin transfer of page ownership | ⬜ |

## Search

| Feature | Status |
|---|---|
| Postgres full-text search (title + body) | ✅ `tsvector`/`ts_rank`, GIN-indexed |
| Permission-filtered results | 🟡 filters on the page's own visibility/explicit share; does not yet include ancestor-inherited access (documented limitation in `postgres-search-provider.ts`) |
| ⌘K command menu | ✅ debounced, keyboard-navigable |
| Rate limiting | ✅ 30/min per user |

## Databases

| Feature | Status |
|---|---|
| Schema (properties, row values, views) | ✅ full domain model, extensible property/view types |
| Domain functions (CRUD properties/rows/views) | ✅ |
| Server actions | ✅ |
| Create a database (sidebar "New" → Database) | ✅ provisions a default title property + Table view |
| Table view | ✅ inline-editable cells for every property type, add/rename/delete property, add row |
| Board view | ✅ grouped by a Select/Status property, inline cell editing on cards, create option inline |
| List view | ✅ minimal — titles only, opens the row's full page |
| Calendar view | ✅ month grid, pick which Date property places rows, prev/next/today navigation, e2e-verified |
| Property types: text/number/checkbox/url/date/select/multi_select/status | ✅ full read+edit UI, e2e-verified |
| Property type: person | ✅ single-assignee picker from workspace members (Notion allows multiple; single is a scope cut) |
| Property type: files | ✅ upload/attach reusing the editor's file service; minimal (no preview) |
| Filters / sorts | ✅ per-view filter (8 operators) and multi-column sort, client-side over loaded rows, e2e-verified; pure logic unit-tested (9 cases) |
| Row = page (comments, sharing, sub-content) | ✅ opening a row's "external link" icon goes to its full page |

E2E-verified end to end (`e2e/database.spec.ts`): create a database, add a Status
property, add a row, set its title, create a new Status option inline, switch to Board,
and confirm the row lands in the right column.

## Files

| Feature | Status |
|---|---|
| Presigned S3 upload/download | ✅ MinIO locally |
| MIME + extension allowlist, size limit | ✅ |
| Randomized object keys, workspace-namespaced | ✅ |
| Upload confirmation (HEAD check before "uploaded") | ✅ |
| Soft delete + object removal | ✅ |

## History

| Feature | Status |
|---|---|
| Automatic snapshots (5-minute coalescing) | ✅ |
| View revision list | ✅ |
| Restore (with pre-restore snapshot) | ✅ |
| Pruning policy for old snapshots | ✅ opportunistic (no cron needed), unit-tested bucketing logic |

## Trash

| Feature | Status |
|---|---|
| Move to Trash (cascades to descendants) | ✅ |
| Restore | ✅ |
| Permanent delete | ✅ |
| Trash view scoped to what the user archived/created | ✅ |

## Themes, Responsive, Accessibility

| Feature | Status |
|---|---|
| Light/Dark/System theme | ✅ `localStorage` + `prefers-color-scheme`, no-flash inline script |
| Responsive sidebar (off-canvas drawer on mobile) | ✅ |
| Keyboard-operable menus/dialogs | ✅ (Radix primitives) |
| Focus-visible states | ✅ design-token-driven |
| Reduced-motion support | ✅ `prefers-reduced-motion` media query in `globals.css` (forces all CSS transition/animation durations to ~0) plus explicit `useReducedMotion()` checks on the handful of JS-driven `motion` animations (sidebar drag lift, comments panel open/close), which the CSS rule alone can't reach |
| Purposeful micro-interactions | ✅ toggle-block expand/collapse (CSS-only, no JS animation library on the hot editor path), sidebar drag lift/settle feedback, comments panel open/close — kept deliberately small in number; see `docs/IMPROVEMENT_PLAN.md` Phase 10 for what was investigated and *not* added (the mobile drawer's existing CSS transition, the command menu's existing transitions) because they already worked and rewriting them would have added nothing |
| Full WCAG 2.2 AA audit | 🟡 built with accessible primitives throughout; automated axe-core sweep (`e2e/accessibility.spec.ts`) covers the auth forms, workspace shell, page editor, a database table, and settings — zero violations, and it caught/fixed a real bug (see `docs/TESTING.md`). This is coverage of what axe can detect automatically, not a substitute for a full manual WCAG 2.2 AA audit (screen-reader walkthroughs, keyboard-only flows end to end, etc.), which hasn't been done |

## Phase 2: Differentiation beyond Notion parity

Not tracked against "what does Notion have" — these are new, not Notion features. See
`docs/ARCHITECTURE.md`'s "Calendar & Google Calendar sync" for the architecture and
`docs/PRODUCT_SPEC.md`'s "Positioning" for why.

| Feature | Status |
|---|---|
| Workspace-level Calendar (`/w/[slug]/calendar`), top-level sidebar nav | ✅ |
| Month / Week / Day / Agenda views | ✅ Month and Week are day-grouped grids, not a pixel-accurate hour-by-hour time grid — a documented scope cut, see `docs/ARCHITECTURE.md` |
| Create / edit / delete events | ✅ title, description, location, start/end, all-day, timezone (browser's own — no picker), attendees (email list), recurrence (none/daily/weekly/monthly preset) |
| Drag-to-reschedule | ✅ Month view only (drag an event onto a different day cell; time-of-day and duration preserved), with optimistic UI + rollback on failure |
| Google account connection (OAuth) | ✅ Settings → Integrations; minimal scopes, encrypted token storage, revoke-on-disconnect — see `docs/SECURITY.md` |
| Google Calendar picker | ✅ choose which of the connected account's calendars to sync |
| Two-way sync | ✅ pull: incremental via Google's `syncToken`, full-resync fallback on 410; push: on local create/edit/delete, best-effort (never blocks the local write) |
| Recurring events (pulled from Google) | ✅ pre-expanded via `singleEvents: true`, not RRULE-parsed locally |
| All-day events | ✅ both directions |
| Sync status feedback | ✅ per-event (synced/local/error badge), connection-level (connected/error/revoked + last-synced time), toasts on sync/save/delete |
| Real-time push (webhook) sync | ⬜ needs a domain-verified public HTTPS endpoint — an external deployment requirement, not implemented; polling ("Sync now" + sync-on-connect) ships instead |
| Public marketing site (landing + About) | ✅ `/` (signed-out) and `/about` |
| Status property: ordered, categorized (todo/in progress/complete), colored stages | ✅ a fresh Status property seeds 3 real stages instead of an empty option list — see `docs/ARCHITECTURE.md`'s "Status, Board drag-and-drop, and the Task list quick-start" |
| Board view: drag-and-drop between columns | ✅ native HTML5 DnD, drop-target highlight, drag-lift feedback |
| "New → Task list" quick-start | ✅ Status/Priority/Due date/Assignee properties pre-provisioned, default Board view grouped by Status |
| Workspace-level Chat (`/w/[slug]/chat`), top-level sidebar nav | ✅ channels, @mention autocomplete (reuses the comments composer), edit/delete own messages |
| Chat real-time delivery | 🟡 3-second polling, not push — see `docs/ARCHITECTURE.md`'s "Chat" for why; a documented scope decision, not a gap discovered later |
