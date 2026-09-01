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
| Duplicate page (recursive) | ✅ |
| Favorite / unfavorite | ✅ |
| Move to Trash / restore / permanent delete | ✅ cascades to descendants |
| Cycle prevention on move | ✅ unit-tested indirectly via `resolve-core`; move.ts's `wouldCreateCycle` |
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
| Architecture designed (Hocuspocus, token-authenticated rooms) | ✅ documented in `docs/ARCHITECTURE.md` |
| `apps/realtime` server implementation | ⬜ **not built in this pass** |
| Presence / collaborator cursors | ⬜ |
| Yjs wiring in the editor (`@tiptap/extension-collaboration`) | ⬜ dependency installed, not wired |

This is the most significant deferred item from the Stop Conditions list — see the final
engineering report for scope/time rationale. Concurrent editing today is safe (optimistic
concurrency prevents silent overwrites) but not merged live; a second editor sees a
"newer version available — reload" prompt instead of live cursors.

## Comments

| Feature | Status |
|---|---|
| Page-level comments | ✅ |
| Block-scoped comments (`blockId`) | 🟡 schema + API support a `blockId`; no UI affordance yet to attach a comment to a specific block (only page-level composer) |
| Threads/replies | ✅ reply inline, indented under the parent, e2e-verified (`e2e/comments.spec.ts`) |
| Resolve/reopen | ✅ resolving hides the whole thread by default; "Show resolved" reveals it |
| Mentions | 🟡 schema (`comment_mentions`) exists; no `@mention` autocomplete UI or extraction-on-write wired |
| Author identity, timestamps | ✅ |
| Permission-aware visibility | ✅ (comment requires `comment` role minimum) |

## Sharing & Permissions

| Feature | Status |
|---|---|
| Private / workspace-visible pages | ✅ |
| Explicit per-user shares (view/comment/edit) | ✅ |
| Inherited permissions from nearest shared ancestor | ✅ unit-tested (`resolve-core.test.ts`) |
| Guests (page-scoped access without full membership) | ✅ sharing a page auto-creates a `guest` membership |
| Public "share to web" link | ✅ token-based; **public viewer route (`/share/[token]`) is not built** — the toggle/token exist but there's no unauthenticated read-only render route yet |
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
| Calendar view | ⬜ not built — the view-type enum and schema support it, no renderer yet |
| Property types: text/number/checkbox/url/date/select/multi_select/status | ✅ full read+edit UI, e2e-verified |
| Property type: person | ✅ single-assignee picker from workspace members (Notion allows multiple; single is a scope cut) |
| Property type: files | ✅ upload/attach reusing the editor's file service; minimal (no preview) |
| Filters / sorts | ⬜ schema and contracts support them; no UI to build a filter or sort — views only group (Board) |
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
| Reduced-motion support | ✅ `prefers-reduced-motion` media query in `globals.css` |
| Full WCAG 2.2 AA audit | 🟡 built with accessible primitives throughout; no dedicated automated audit (axe/Lighthouse) run in this pass |
