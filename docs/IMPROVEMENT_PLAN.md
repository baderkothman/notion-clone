# Improvement Plan — Quality, UI/UX, and Performance Pass

Status: **plan only, nothing implemented yet.** Produced by inspecting the current
codebase, running React Doctor (full + design scans), running `pnpm audit`, and
reviewing the reference sites/skills requested. Re-run Phase 0's commands before
starting implementation to confirm this baseline hasn't drifted.

This does **not** change product direction or add post-Notion features. It is a
targeted correctness/security/architecture/UX/performance pass on the existing app.

## 1. Current-state findings

- Turborepo + pnpm monorepo: `apps/web` (Next.js 15 App Router, React 19),
  `apps/realtime` (Hocuspocus/Yjs, just completed this session), `packages/{contracts,
  database, auth, editor, ui, shared}`.
- Feature completeness is high for a phase-1 Notion clone (see `docs/NOTION_PARITY.md`):
  auth, workspaces, page hierarchy, a 15+ block-type Tiptap editor, autosave with
  optimistic concurrency, live realtime collaboration with presence, sharing/permissions
  via a recursive-CTE resolver, comments (page + block-scoped, @mentions), search
  (Postgres FTS + ⌘K palette), Notion-style databases (Table/Board/Calendar/List, filters/
  sorts), S3 file uploads, page history, trash.
- Test coverage is strong: 46 unit tests, 10 integration tests (real Postgres), 17
  Playwright e2e specs including a dedicated accessibility (axe-core) sweep and a
  two-browser realtime-collaboration test. This is the safety net every phase below
  leans on.
- **No global client state library** — local component state + Server Actions + two
  small Context providers (`SidebarRefreshProvider`). This is architecturally
  appropriate at current scope; nothing in this plan introduces Redux/Zustand/Jotai
  speculatively (Karpathy: no abstractions the app doesn't need yet).
- **Zero code-splitting** anywhere — no `next/dynamic`, no `React.lazy`, no dynamic
  `import()` in the whole `apps/web/src` tree. The full editor (Tiptap + all custom
  nodes) and the realtime stack (Yjs + Hocuspocus provider) ship in the initial JS for
  `/w/[slug]/p/[id]` (~389kB First Load JS per the last `next build`), even for read-only
  viewers and even on deployments without realtime configured.
- **No `React.memo` anywhere** in the 171-file `src` tree, including the recursive
  sidebar page-tree and the database table/board row renderers.
- Design system: Tailwind v4 CSS-variable tokens, Radix primitives wrapped in
  `packages/ui`, dark/light/system theme via a nonce'd inline script. Solid foundation;
  the design audit below shows unpolished Tailwind hygiene and a handful of real UX gaps
  layered on top of it, not a broken foundation.
- **No public marketing/landing page exists.** `/` redirects an unauthenticated visitor
  straight to `/sign-in`. `supahero.io` (hero-section gallery) has no current target to
  apply to — noted as future/out-of-scope, not folded into these phases (see §6).

## 2. Important UI/UX problems and opportunities

- **Hover-only row actions are keyboard- and touch-unreachable.** `page-tree-item.tsx`'s
  "…" and "+" buttons, `board-view.tsx`'s card actions, `table-view.tsx`'s row actions,
  and `page-cover.tsx`'s "change cover" button are all `hidden group-hover:flex` (or
  equivalent) — a `display:none` element cannot receive keyboard focus at all, so Tab
  never reaches them, and there is no hover on touch. This is the single highest-value
  fix in the whole plan (§6 / Phase 6).
- **Mobile drawer backdrop is a non-semantic clickable `<div>`** (`app-shell.tsx:57`)
  with no keyboard path and no Escape-to-close/focus-return — a real keyboard trap on
  the only mobile navigation affordance.
- **`100vh` instead of `100dvh`** in 9 places — mobile Safari/Chrome's dynamic toolbar
  will visibly clip these layouts.
- **18 form controls render text under 16px** — triggers iOS Safari's auto-zoom-on-focus,
  a well-known mobile UX defect.
- **No loading skeletons** beyond a couple of ad hoc "Loading…" text lines in the
  sidebar's lazy-expand. No layout-matched skeleton for the workspace shell or a page
  while it loads.
- **Onboarding is a single form** ("create your first workspace") with nothing after —
  no first-page hint, no slash-menu nudge. Thinnest part of the current product; this is
  finishing existing onboarding UX, not a new feature.
- **Essentially zero purposeful motion**: two bespoke Tailwind keyframe classes
  (`animate-fade-in`, `animate-slide-down` in the command menu) and plain CSS
  transitions on the mobile drawer/hovers. Toggle-block expand/collapse is an instant
  `display:none` flip; drag-and-drop reorder feedback is a static inset shadow with no
  lift/settle; dialogs/panels don't share a consistent enter/exit language.
- **Command palette (⌘K) is already solid** — 200ms-debounced search, arrow-key nav,
  proper Radix `Dialog.Title`/`Description` for a11y, visible `⌘K` hint. Not a problem;
  the only opportunity (lower priority) is blending in actions ("New page", "New
  database") the way Raycast/Linear-style palettes do, referenced via 21st.dev.
- Known, already-documented gaps (no change proposed here, just noted so this plan
  doesn't duplicate `NOTION_PARITY.md`): no dedicated "Shared with me"/"Recent" sidebar
  sections, no direct cover-image upload (URL-paste only).

## 3. Architecture / code-quality findings

- **`page-view.tsx` is becoming a God component**: 327 lines, ~10 `useState` hooks, ~10
  handlers, 9 props. Candidate for extracting `useComments(pageId)` and a small
  page-chrome hook (icon/cover/title local state), matching the extraction pattern
  already established for `useAutosave`/`useCollaboration` in `packages/editor`.
- **Dead dependencies** (verified by grep, not just react-doctor's flag): 6 Radix
  packages + `clsx` + `tailwind-merge` are declared in `apps/web/package.json` but never
  imported directly there — they're already owned by `packages/ui`, which apps/web only
  consumes through the package boundary. `@radix-ui/react-select` is unused anywhere in
  the repo. `@tiptap/extension-character-count` is unused in `packages/editor`.
- **13 unused exports** across action files and `page-tree.tsx` — each needs individual
  verification before deletion (a few may be load-bearing for Next's server-action
  conventions or consumed only via a barrel re-export static analysis doesn't trace).
- **9 sequential-independent-`await`s** in route/layout files and two server modules —
  real, mechanical latency cost on every cold page load (users wait twice as long for
  two unrelated queries that could run in parallel).
- **4 loading-flag-reset-outside-`finally`** — a real bug class: if the awaited action
  throws, the loading/disabled state can get stuck permanently.
- **1 stale-async-response bug** (`share-dialog.tsx:54`) — an in-flight request's
  completion can clobber a newer request's state if responses arrive out of order.
- **2 array-index-as-key** in `filter-sort-controls.tsx` — real risk if a filter/sort
  condition is ever removed from the middle of the list (React would misattribute state
  to the wrong row).
- **1 unguarded numeric parse** in `filter-sort-controls.tsx` — a non-numeric filter
  value likely produces a silent `NaN` comparison.
- **9 stale-prop-copy findings** (`no-derived-useState` ×5, `no-mirror-prop-effect` ×2,
  `no-reset-all-state-on-prop-change` ×2) across `page-view.tsx`, `share-dialog.tsx`,
  `database-page-header.tsx`, `trash-list.tsx`, `property-cell.tsx`,
  `slash-menu/menu-view.tsx` — each needs case-by-case review; some may be an
  intentional "seed local editable state once" pattern rather than a bug, and must not
  be mass-"fixed" without checking.
- **2 `exhaustive-deps`** in `comment-indicators.tsx` and `drag-handle.tsx` — treat with
  extra care: this session's own history includes a serious, hard-to-detect drag-handle
  interaction bug in this exact file (documented in `tasks/todo.md`), found only through
  real-pointer e2e testing, not code inspection. Any dependency-array change here needs
  the same discipline: manual real-pointer verification, not just a green test suite.

## 4. React Doctor baseline (raw output saved: `/tmp/react-doctor-full.log`,
`/tmp/react-doctor-design.log`)

**Full scan** — `npx react-doctor@latest --verbose`:

```
Score: 41 / 100 — Critical
98 issues
  Security:        1 error
  Maintainability: 24 warnings
  Bugs:            38 warnings
  Accessibility:   26 warnings
  Performance:      9 warnings
```

Top contributors: `deslop/unused-dependency` ×9, `socket/low-supply-chain-score` ×1
(critical, see §5), `deslop/unused-export` ×13, `server-sequential-independent-await`
×9, `no-loading-flag-reset-outside-finally` ×4, `control-has-associated-label` ×12,
`no-derived-useState` ×5, `click-events-have-key-events` ×1, `no-static-element-
interactions` ×1, `no-locale-format-in-render` ×3, `js-combine-iterations` ×5,
`no-array-index-as-key` ×2, `no-unguarded-numeric-input-parse` ×1,
`no-placeholder-only-field` ×9, `no-autofocus` ×3, `no-mirror-prop-effect` ×2,
`no-reset-all-state-on-prop-change` ×2, `js-set-map-lookups` ×3,
`only-export-components` ×1, `rerender-state-only-in-handlers` ×1,
`nextjs-no-img-element` ×4, `no-unowned-async-error-clear` ×1,
`prefer-module-scope-static-value` ×1, `no-pass-live-state-to-parent` ×1,
`no-prop-callback-in-effect` ×1, `exhaustive-deps` ×2, `no-adjust-state-on-prop-change` ×2.

**Design scan** — `npx react-doctor@latest design --verbose`:

```
77 issues (no aggregate score for this mode)
  Maintainability: 50 warnings
  Accessibility:   27 warnings
```

Top contributors: `design-no-redundant-size-axes` ×35, `no-small-form-control-text`
×18, `prefer-dvh-over-vh` ×9, `no-hover-only-reveal` ×4 (the keyboard/touch bug from
§2), `no-arbitrary-px-font-size` ×4, `design-no-redundant-padding-axes` ×2,
`design-no-space-on-flex-children` ×1, `no-tiny-uppercase-tracked-label` ×1,
`no-uppercase-tracked-navigation-label` ×1, `no-cramped-container-padding` ×1,
`design-no-em-dash-in-jsx-text` ×1.

The two scans overlap on some files (e.g. `control-has-associated-label` /
`no-small-form-control-text` hit the same controls) — fix once per site, then re-run
both scans, don't duplicate work per finding.

## 5. Security / accessibility / performance concerns

**Security — critical, fix first:**

`pnpm audit` on the current lockfile: **15 vulnerabilities — 3 critical, 5 high, 7
moderate**, almost entirely from `next-auth@5.0.0-beta.25` (patched at `beta.32`):

- 2 critical: auth checks can **fail open** on a provider configuration error
  (GHSA-8fpg-xm3f-6cx3); email normalizer allows a **homoglyph `@` bypass**
  (GHSA-7rqj-j65f-68wh, also affects the transitive `@auth/core@0.37.2`).
- High: `getToken()` throws uncaught on a malformed Bearer header
  (GHSA-xmf8-cvqr-rfgj).
- Moderate: email misdelivery (GHSA-5jpx-9hw9-2fx4); OAuth state/nonce/PKCE cookies not
  bound to their provider (GHSA-x445-f3h2-j279, N/A in effect here — Credentials-only,
  no OAuth providers configured — but still worth patching).
- Moderate, unrelated chain: `postcss<8.5.10`/`<8.5.23` transitively via `next@15.5.25`;
  `esbuild<=0.24.2` transitively via `drizzle-kit` (**dev-only** exposure —
  `drizzle-kit` is a devDependency, never shipped or run in production).

`docs/SECURITY.md` currently claims "no dependency pinned to a version with a known
critical/high CVE at the time of writing" — that's now stale and must be corrected once
Phase 1 lands.

**Accessibility** (beyond React Doctor): the hover-only-reveal and mobile-drawer
keyboard-trap issues from §2 are the concrete, testable items. `e2e/accessibility.spec.ts`
already runs an axe sweep on the auth forms/workspace shell/editor/database
table/settings, but its current page set doesn't specifically exercise a hovered sidebar
row or an open mobile drawer/filter-sort popover — worth expanding once those are fixed,
so this class of regression is caught automatically going forward.

**Performance**: covered in detail in §3 (code-splitting, memoization,
sequential-await). No virtualization in the sidebar tree or database table/board views —
acceptable at current scale (dozens of items), flagged as backlog-tier, not urgent for
this pass.

## 6. Reference/skill mapping — what's used for what

| Reference | Applied to |
|---|---|
| **21st.dev** | Sidebar row-action affordance pattern (persistent-but-quiet vs. hover-only), command-palette polish reference, dialog/sheet structural reference when touching `ShareDialog`/`CommentsPanel`/`HistoryPanel`. |
| **refero.design/styles** | Overall density/typography scale check for the workspace shell (sidebar width, header height, breadcrumb sizing), empty-state composition, navigation hierarchy consistency (breadcrumbs + sidebar + tabs). |
| **supahero.io** | **Not used in this pass** — no public marketing page exists to apply it to, and the task explicitly says not to force marketing UI into the workspace. Noted for a future, separate initiative only. |
| **motion.dev** (`motion` npm package, `import { motion } from "motion/react"`) | Targeted only (Phase 10, last): toggle-block expand/collapse height animation, sidebar drag lift/settle feedback, `AnimatePresence` for the mobile drawer/comments panel where it measurably beats the current CSS transition, all gated on `prefers-reduced-motion`/`useReducedMotion()`. Never touches the per-keystroke editor render path. |
| **60fps.design** | Calibration reference during Phase 10's implementation (timing/easing feel) and for the Phase 6/7 loading/empty-state category — not a component source. |
| **github.com/multica-ai/andrej-karpathy-skills** | Operating discipline for every phase: smallest diff that fixes the stated problem; no refactoring adjacent code while touching a file; no speculative abstractions or state-management library; state uncertainty/false-positive risk explicitly before mass-editing a react-doctor rule; verify with tests, not inspection alone. |

## 7. Prioritized phases (dependency order)

Ordered per the requested priority: **critical correctness/security → architecture →
core UX → accessibility → React quality → performance → visual polish → motion.**
Phase 0 re-runs before implementation starts; the final gate re-runs everything after
Phase 10.

### Phase 0 — Baseline re-confirmation
Re-run `pnpm audit`, `npx react-doctor@latest --verbose`, `npx react-doctor@latest
design --verbose`, `pnpm typecheck && pnpm lint && pnpm -r test`, full Playwright suite.
Confirm the numbers in §4/§5 still hold before changing anything.

### Phase 1 — Critical security — ✅ DONE

Bumped `next-auth` to `5.0.0-beta.32` (fixes 2 critical + 1 high CVE) in both
`packages/auth/package.json` and `apps/web/package.json`. `packages/auth/src/config.ts`/
`edge-config.ts` needed no changes (Credentials-only, no OAuth surface touched).

While re-running `pnpm audit` after the bump, found a **second** critical-tier finding
not caught in the original plan pass (the earlier audit output had been truncated):
`drizzle-orm@0.38.3` carried a high-severity SQL-injection CVE in `sql.identifier()`/
`sql.as()` (fixed in `0.45.2`). Verified by grep that this codebase never calls either
function (zero actual exploitability), but bumped anyway — `drizzle-orm` to `0.45.2`,
`drizzle-kit` to `0.31.10` to match. This is the ORM every server module depends on, so
it got the heaviest verification of the two: full typecheck, full unit suite, all 10
integration tests against real Postgres (exercises the recursive CTEs directly), and the
full 17-test Playwright suite.

`pnpm audit`: **15 vulnerabilities (3 critical, 5 high, 7 moderate) → 5 (0 critical, 2
high, 3 moderate)**. The remaining 5 are accepted residual risk, documented with
reasoning in `docs/SECURITY.md`'s Dependencies section: PostCSS's CVEs are bundled
inside `next@15.5.25` itself and require processing untrusted CSS (never happens here);
esbuild's CVE reaches this repo only via `drizzle-kit`'s dev-only transitive chain
(never shipped to production).

**Files changed**: `packages/auth/package.json`, `apps/web/package.json`,
`packages/database/package.json`, `docs/SECURITY.md`.

**Verified**: `pnpm audit` (15→5, 0 critical remain); `pnpm typecheck` (8/8 packages);
`pnpm lint`; `pnpm -r test` (46/46 unit tests); `pnpm test:integration` (10/10, real
Postgres); `pnpm --filter web build` (clean, route sizes unchanged); full Playwright
suite (17/17, including `core-flow.spec.ts`, `authorization.spec.ts`,
`workspace-settings.spec.ts`, and everything else since drizzle-orm underlies every
server action).

### Phase 2 — Correctness bugs (React Doctor "Bugs" category) — ✅ DONE

Fixed with individual review, not batch autofix:

- **loading-flag-reset-outside-finally** (4 sites): wrapped in `try/finally` —
  `general-settings-form.tsx`, `share-dialog.tsx`, `page-tree.tsx`, `page-tree-item.tsx`.
- **`no-unowned-async-error-clear`** (`share-dialog.tsx`): the real race was two
  independent `listSharesAction` calls (the open-triggered effect and handleInvite's own
  refresh) landing out of order — fixed with a monotonic request-id ref
  (`shareRequestIdRef`) that drops a stale response, and consolidated both call sites
  into one `refreshShares()` function.
- **`no-array-index-as-key` + `no-unguarded-numeric-input-parse`**
  (`filter-sort-controls.tsx`): added a per-row stable-id `keysRef` (lazy-initialized,
  kept in lockstep by add/remove) instead of index-as-key; guarded the number-filter
  input's parse so an empty/invalid value can't silently coerce to `0` or leak a `NaN`
  into the stored filter — verified manually (Playwright can't even type non-numeric
  text into a native `<input type="number">`, so the real-world case is the empty-input
  guard, confirmed working).
- **`no-mirror-prop-effect` + `no-reset-all-state-on-prop-change`**
  (`property-cell.tsx`'s Text/Number/UrlCell): the local-draft-resynced-from-prop pattern
  is deliberate (Notion/Airtable-style blur-commit inline cells), not a bug on its own —
  extracted the shared logic into one `useDraftValue` hook and added the one real fix it
  needed: an `isFocusedRef` guard so the resync effect can't clobber in-progress
  keystrokes if `value` changes while the cell is focused.
- **`no-derived-useState`** (5 sites) and **`exhaustive-deps`**
  (`comment-indicators.tsx`, `drag-handle.tsx`): investigated individually, **not
  changed** — see "A false alarm worth recording" below for why.

**A false alarm worth recording**: initially "confirmed" (via a flawed Playwright test —
`waitForURL(/\/p\//)` matched trivially against the *already-current* URL, so the
"second navigation" never actually happened) that `page-view.tsx`/`page-title.tsx`'s
`no-derived-useState` findings were a real bug — stale title/icon surviving a
client-side sidebar navigation between two different pages. Went as far as shipping a
`key={page.id}` fix before re-testing properly (waiting for the URL to actually change).
The corrected test showed the *original*, unmodified code already resets correctly on a
real navigation — no bug exists. Reverted the fix. This is exactly the "verify before
mass-editing" discipline this plan called for in principle, learned the hard way in
practice: **the same false-positive reasoning was then correctly applied, without
needing to re-litigate it, to the other 4 `no-derived-useState` sites and the two
`exhaustive-deps` sites** (both flag a ref-object omitted from a dependency array; refs
are stable across renders, `pnpm lint`'s own `react-hooks/exhaustive-deps` — the
canonical rule — doesn't flag either, and `drag-handle.tsx` in particular carries a
documented history of a real bug found only through actual pointer testing, so it gets
extra weight toward "don't touch without strong evidence").

**Also found and fixed while re-scanning after these edits** (`--scope changed` surfaced
them once the touched files were rescanned): 2 more `control-has-associated-label` +
2 `js-combine-iterations` in `database-view.tsx` (added `aria-label`s to the Group-by/
Date-property `<select>`s; combined `.filter().map()` into single-pass `.reduce()`s). A
`no-ref-current-in-render` pair in `filter-sort-controls.tsx` was investigated against
the rule's own published doc (which says the null-guarded lazy-init pattern "remains
supported"), tried in two idiomatic forms (`if (ref.current === null)` and `??=`), both
still flagged — recorded as a confirmed tool false positive rather than restructured
into an effect, which would add a real render-lag to satisfy an over-strict static
heuristic. Also added `key={activeViewId}`-based remounting for `FilterControl`/
`SortControl` in `database-view.tsx` — this one *is* a genuine fix (switching database
views really does swap `filters`/`sorts` wholesale from outside the component).

**Files changed**: `general-settings-form.tsx`, `share-dialog.tsx`, `page-tree.tsx`,
`page-tree-item.tsx`, `filter-sort-controls.tsx`, `property-cell.tsx`,
`database-view.tsx`.

**Verified**: `pnpm typecheck && pnpm lint` clean; `pnpm -r test` (46/46); full
Playwright suite (17/17); `npx react-doctor@latest --verbose --scope changed` down to
only the 2 confirmed-false-positive `no-ref-current-in-render` occurrences plus the 2
confirmed-non-bug `share-dialog.tsx` re-flags (see above); manual verification of the
number-filter guard and the false-alarm navigation scenario.

### Phase 3 — Server round-trip latency (`server-sequential-independent-await`, 9 sites) — ✅ DONE

Converted `await params; await requireUserId();` into `Promise.all([params,
requireUserId()])` in all 6 flagged route layout/page files (workspace layout, page
route, workspace home, settings layout, settings members, settings general, trash) —
these two calls never depended on each other, so every one of those page loads was
waiting twice as long for nothing. Parallelized two independent same-table-free SELECTs
in `restore.ts` (a `documents` row and a `pages` row, different tables, no dependency)
and in `duplicate.ts`'s `cloneSubtree` (same pattern, `pages` + `documents`).

**Investigated and deliberately left alone**: `index-page.ts`'s `indexPageTitle`/
`indexPageBody` calls in `restore.ts` looked like the same pattern at a glance but
aren't — both read-then-write the *same* `search_documents` row via
`INSERT ... ON CONFLICT DO UPDATE`, and running them concurrently would race (a classic
lost-update: whichever finishes first could get silently overwritten by the other's
stale read of the row). React Doctor correctly didn't flag these two lines; worth
recording since it would have been an easy, wrong "obviously the same fix" mistake.

**Files changed**: the 6 route files above, `apps/web/src/server/history/restore.ts`,
`apps/web/src/server/pages/duplicate.ts`.

**Verified**: `pnpm typecheck && pnpm lint` clean; `pnpm test:integration` (10/10, real
Postgres — directly exercises `duplicatePage`'s recursive clone through the changed code
path); full Playwright suite (17/17); `npx react-doctor@latest --verbose --scope
changed` shows the rule fully cleared (0 occurrences), only the same 4 previously-
investigated Phase 2 findings remain.

### Phase 4 — Dependency hygiene — ✅ DONE

Removed the 8 confirmed-dead deps from `apps/web/package.json` (6 Radix packages, `clsx`,
`tailwind-merge` — all already owned by `packages/ui`, re-verified with a fresh grep
before deleting, zero direct imports in `apps/web/src`) and `@tiptap/extension-
character-count` from `packages/editor/package.json`.

Individually investigated all 13 unused-export sites. All 13 turned out to follow one of
two clean patterns:

- **12 were genuinely dead "list"/single-item Server Action wrappers** whose domain
  function is only ever called *server-side directly* (in a route's `page.tsx`/
  `layout.tsx`), never re-fetched from the client — this is a systemic, consistent
  architecture choice in this codebase (server-rendered initial data + optimistic local
  mutation, no client-driven re-fetch actions), not 12 unrelated oversights. Removed:
  `updateCommentAction`, `listPropertiesAction`, `listRowsAction`, `listViewsAction`,
  `deleteFileAction`, `getRevisionAction`, `listFavoritesAction`, `listTrashAction`,
  `getBreadcrumbsAction`, `updateShareRoleAction`, `listPendingInvitationsAction`,
  `getInvitationPreviewAction`. In each case, checked whether the *domain function* the
  action wrapped was used elsewhere before removing its now-unused import — it usually
  was (the direct server-side call site), so only the thin action wrapper was deleted,
  not the underlying logic.
- **1 was legitimate not-yet-wired infrastructure, not a mistake**: `PageTreeSkeleton`
  in `page-tree.tsx` — a real, already-built loading skeleton with no `<Suspense>`
  boundary to render it in yet. Left in place rather than deleted; noted for Phase 7
  (loading states), which is exactly where wiring it up belongs.

**Files changed**: `apps/web/package.json`, `packages/editor/package.json`, and the 6
action files (`comments.ts`, `databases.ts`, `files.ts`, `history.ts`, `pages.ts`,
`sharing.ts`, `workspaces.ts` — 7, not 6, correcting as I write this) — each edit also
removed the action's now-dangling import of its domain function/input type where nothing
else in that file still used it.

**Verified**: clean `pnpm install`; `pnpm typecheck && pnpm lint` clean; `pnpm -r test`
(46/46); `pnpm test:integration` (10/10); `pnpm --filter web build` clean, route sizes
unchanged; full Playwright suite (17/17) — proves nothing was silently relying on a
"dead" export; `npx react-doctor@latest --verbose --scope changed` shows both
`deslop/unused-export` and `deslop/unused-dependency` fully cleared from the diff.

### Phase 5 — Architecture: shrink `page-view.tsx` — ✅ DONE

Extracted `useComments(pageId, workspaceId)` (comments/members lists, panel open/target
state, create/resolve/delete mutations, the `commentedBlockIds` memo) and
`usePageChrome(pageId, initialIcon, initialCover)` (icon/cover local-editable state and
their save actions) out of `page-view.tsx`, matching the existing `useAutosave`/
`useCollaboration` extraction pattern already used there. Pure extraction — every prop
passed to `CommentsPanel`/`PageIconPicker`/`PageCover`/`BlockEditor` resolves to the
exact same value as before, just sourced from the hook's return object instead of local
state/handlers.

**Files changed**: `apps/web/src/components/page/page-view.tsx`, new
`apps/web/src/components/page/use-comments.ts`,
`apps/web/src/components/page/use-page-chrome.ts`.

**Verified**: `pnpm typecheck && pnpm lint` clean; full Playwright suite (17/17,
including `comments.spec.ts` and `block-comments-and-mentions.spec.ts`, which exercise
`useComments` directly). `page-view.tsx` went from 327 → 252 lines (−23%) and from ~9
local `useState` hooks + 6 handler functions down to 3 `useState`/1 ref + 1 handler, with
the comments and icon/cover concerns now independently readable and reusable.

### Phase 6 — Core UX / accessibility: keyboard & touch reachability — ✅ DONE

Changed the 4 hover-only row-action sites (`page-tree-item.tsx`'s "…"/"+" buttons,
`board-view.tsx`'s open-page icon, `table-view.tsx`'s open-page icon, `page-cover.tsx`'s
"Change"/remove controls) from `hidden ... group-hover:flex/block`
(`display:none` — unfocusable, untappable) to always-in-the-DOM: visible by default
below the `sm:` breakpoint (touch/small screens rarely have reliable hover, so default
to shown), and hover/focus-revealed (`sm:opacity-0 sm:group-hover:opacity-100
sm:group-focus-within:opacity-100`) at `sm:` and up, where a pointer that can hover is
the norm. `group-focus-within` means a keyboard user tabbing into any of these buttons
reveals them regardless of screen size.

Fixed the mobile drawer (`app-shell.tsx`): the backdrop is now a real `<button>` (was a
`<div onClick>` — no keyboard/screen-reader affordance at all), Escape closes the drawer
from anywhere inside it, and closing (via Escape, the backdrop, or the hamburger button
itself) returns focus to the hamburger trigger rather than letting it fall back to
`<body>`.

**Files changed**: `page-tree-item.tsx`, `board-view.tsx`, `table-view.tsx`,
`page-cover.tsx`, `app-shell.tsx`. Also fixed two pre-existing, unrelated
accessibility findings surfaced by re-scanning `table-view.tsx` once touched (same
"fix what I find while I'm already in the file, with full verification" practice as
earlier phases): a property-rename `<input>` and a row-title `<input>` both missing an
accessible label (`aria-label` added to both).

**Verified**: `pnpm typecheck && pnpm lint` clean; `npx react-doctor@latest --verbose
--scope changed` shows `no-hover-only-reveal`, `click-events-have-key-events`, and
`no-static-element-interactions` all cleared; two new permanent e2e regression tests
added to `e2e/accessibility.spec.ts` — focusing the sidebar's "Page options" button
directly (exactly what Tab does) reveals it (`opacity: 1`) without any hover, and
pressing Escape while the mobile drawer is open closes it and returns focus to the
hamburger button. Full Playwright suite: 19/19 (17 previous + 2 new).

### Phase 7 — Design-scan mechanical fixes (batch, low-risk) — ✅ DONE

`design --verbose` went from 73 issues to **"No issues found!"** — every single one
cleared, verified by re-running the design scan after each batch rather than trusting
the fix blind:

- `w-N h-N` → `size-N` (35 sites, 34 files): scripted, not manual — a Python pass parsed
  every `className="..."` string, found genuine same-value `w-X`/`h-X` pairs (including
  variant-prefixed ones like `hover:w-4 hover:h-4`), and merged them. Deliberately did
  NOT touch `className={cn(...)}` call sites (a regex on a JS expression isn't safe the
  same way); none of the 35 turned out to need that.
- Sub-16px form control text → `text-base` (18 sites): fixed on the actual `<input>`/
  `<select>` element in each case, not surrounding text — this is what prevents iOS
  Safari's auto-zoom-on-focus, a real mobile UX defect, not just a lint nit.
- `100vh` → `100dvh` (9 sites): `min-h-screen`/`h-screen` → `min-h-dvh`/`h-dvh`, plus one
  inline `style={{minHeight: "100vh"}}` in `global-error.tsx`.
- Remaining ~10 mixed findings, each handled on its own terms rather than mechanically:
  arbitrary `text-[11px]`/`text-[10px]` → `text-xs` (4 sites); the comment panel's
  "On a block" label rewritten from tiny-uppercase-tracked (a pattern this plan's own
  UI direction calls out as a generic-AI tell) into a small colored pill in sentence
  case; redundant padding axes merged to shorthand (`table-view.tsx`, 2 sites); the
  avatar-stack overlap in `collaboration-presence.tsx` switched from `-space-x-*` (which
  can't express negative values without the sibling-margin trick's RTL/hidden-child
  weaknesses) to explicit per-avatar `-ml-*`; one em dash in user-facing copy rewritten;
  cramped container padding bumped to react-doctor's own stated 8px minimum on both
  sites (iterated per its numeric guidance, not guessed).
- **Two fixes introduced new findings on the next scan** (`no-symmetric-text-button-
  padding` after collapsing `table-view.tsx`'s `px-2 py-2` to `p-2`; `no-cramped-
  container-padding` after an insufficient first padding bump) — both caught and
  corrected by re-scanning after every batch rather than assuming a fix was complete.

**Also completed while re-scanning the full (non-design) rule set afterward**: removed
4 more now-truly-orphaned domain functions this phase's edits had turned into dead code
— `updateComment`, `deleteFile`, `getRevision`, `updateShareRole` (each had already lost
its only caller in Phase 4, but I'd deliberately kept the domain function itself then;
now confirmed zero callers exist anywhere, so kept vs. removed was revisited and settled
on removed) — and `PageTreeSkeleton` plus the `Skeleton` primitive it was the only
consumer of (genuinely unused, no near-term wiring point in the current architecture).
`deslop/unused-export` is now fully clear across the whole codebase. Added 2 missing
`aria-label`s on `members-manager.tsx`'s role `<select>`s (surfaced by the same
touched-file re-scan) and fixed a real (if narrow) hydration-mismatch risk:
`calendar-view.tsx`'s month/year heading used `toLocaleDateString(undefined, ...)` —
an implicit locale that can differ between server and browser — pinned to `"en-US"`
explicitly, matching the app's English-only UI. (`comments-panel.tsx`/`history-panel.tsx`'s
matching `no-locale-format-in-render` flags were investigated and left alone: both are
gated behind an `open`-starts-`false` panel that Radix never mounts into the DOM until
opened, so the date formatting genuinely never runs during SSR — a confirmed false
positive, not the same risk as the calendar heading.)

**Deliberately left as documented, reviewed backlog** (pre-existing, not introduced by
this pass, individually inspected and judged lower-value than the phases still ahead):
`no-autofocus` ×3 (autofocus on a just-opened command-palette/popover input is standard,
expected UX, not the WCAG page-load-autofocus problem the rule is really about);
`nextjs-no-img-element` ×4 (`bookmark.tsx`, `image-block.tsx`, `image-block.tsx`'s
public counterpart — all render external/presigned URLs of unknown dimensions,
the same justification already documented at `page-cover.tsx`'s existing eslint-disable);
`no-placeholder-only-field` ×3, `js-combine-iterations` ×3, `js-set-map-lookups` ×2,
`only-export-components`, `rerender-state-only-in-handlers` — all real but low-severity,
on small lists with negligible practical impact.

**Files changed**: 34 files for the size-axes merge; the 18 form-control-text files;
9 files for dvh; `calendar-view.tsx`, `comments-panel.tsx`, `command-menu.tsx`,
`table-view.tsx` (×2 rules), `collaboration-presence.tsx`, `history-panel.tsx`,
`members-manager.tsx`; `comments.ts`, `upload.ts`, `history/queries.ts`, `share.ts`,
`page-tree.tsx`, `packages/ui`'s `index.ts` + deleted `skeleton.tsx`, `theme-toggle.tsx`.

**Verified**: `pnpm typecheck && pnpm lint` clean throughout (re-run after every batch,
not just at the end); `pnpm -r test` (46/46); `pnpm test:integration` (10/10); full
Playwright suite (19/19) after rebuilding — the domain-function removals in particular
needed this, since `comments.ts`/`upload.ts`/`history/queries.ts`/`share.ts` are exactly
what the comments/file-upload/history/sharing e2e specs exercise; `npx react-doctor@latest
design --verbose` → **0 issues**; full scan's `deslop/unused-export` → **0 issues**.

### Phase 8 — Performance: code-splitting ✅ DONE

**What was actually done, and why it stopped short of the original scope:**

Measured first, with hard evidence, before changing anything: built the app, read
`.next/app-build-manifest.json` for both `/share/[token]/page` (public, read-only —
`public-page-view.tsx`, never `editable` or collaborative) and
`/(app)/w/[workspaceSlug]/p/[pageId]/page` (the real editor), and grepped the shared
chunks for `Hocuspocus|yjs|Y.Doc`. Confirmed a 368KB chunk containing Yjs/Hocuspocus code
was loaded by *both* routes — real, measured waste on the public route, not a guess.

**Win 1 (shipped): dynamically import the three closed-by-default dialogs.**
`ShareDialog`, `HistoryPanel`, and `CommentsPanel` all render nothing until the viewer
opens them. Wrapped each in `next/dynamic(() => import(...).then(m => m.X))` in
`page-view.tsx`. Rebuilding showed `HistoryPanel` and `CommentsPanel` immediately split
into their own small chunks — but `ShareDialog` stayed inlined in the route bundle. Root
cause: `database-page-header.tsx` (the header used when the open page *is* a database)
had its own, separate static `import { ShareDialog } from "@/components/page/share-dialog"`
— a second synchronous importer that kept it merged in. Applied the identical
`next/dynamic()` wrapping there too; rebuilding confirmed `ShareDialog`'s code (found via
its distinctive `listSharesAction`/`refreshShares` symbols) now lives in its own chunk,
separate from both route bundles. Zero behavioral risk: these components already
conditionally render `null` until opened, so this only changes *when* their code is
fetched, never *what* renders. Cascade fix along the way: `react-doctor --scope changed`
flagged a new `no-unowned-async-error-clear` on `share-dialog.tsx`'s `handleInvite` (a
bare `setLoading(false)` in `finally`, no request-ownership check) — the Invite button is
already `disabled` while loading so this was never reachable in practice, but fixed it
anyway with the same monotonic-request-id guard already used by this file's
`refreshShares`, for consistency and defense-in-depth. Confirmed the finding cleared on
re-scan.

**Attempted, measured, and reverted: dynamically importing `BlockEditor` in
`public-page-view.tsx`.** This was expected to be the bigger win — splitting the whole
`@notion-clone/editor` package (which is what actually pulls in the Yjs/Hocuspocus
extensions via `packages/editor/src/kit.ts`'s unconditional top-level imports of
`@tiptap/extension-collaboration`/`-collaboration-cursor`) out of the public route
entirely. Implemented `const BlockEditor = dynamic(() => import("@notion-clone/editor").then(m => m.BlockEditor), { ssr: true })`
and rebuilt. **Measured result: zero benefit.** The route's First Load JS was unchanged
(346KB → 347KB, noise), and `app-build-manifest.json` showed the yjs-containing chunk
(new hash, same 372KB, same content) was *still* listed as a required initial script for
`/share/[token]/page` — `next/dynamic(..., { ssr: true })` splits the module into its own
chunk file but, because the component is rendered during SSR and must hydrate
immediately with no loading gap, Next.js still marks that chunk as required upfront
rather than deferred. It doesn't achieve the code-splitting outcome we wanted here.

The only way to actually defer the fetch is `ssr: false`, which was rejected: this is a
publicly-shared, potentially-crawled/linked-preview page whose entire purpose is showing
its content, and `ssr:false` would mean the page ships empty and needs client JS just to
render text — a real UX/SEO regression for a bundle-size micro-optimization. The other
real fix — restructuring `packages/editor/src/kit.ts` so the collaboration extensions are
only ever imported when a real `collaboration` prop is about to be constructed (which
only happens in the authenticated editor's "collab" mode, never on the public route) —
would require making extension construction async and touching `block-editor.tsx`'s
mount flow, i.e. exactly the sync-gating machinery §11 said to be most careful with, for
a win that only benefits an anonymous, read-only route. Reverted `public-page-view.tsx`
to its original, unmodified state (verified via diff against the pre-Phase-8 version) and
recorded this as a deliberately-deferred, higher-risk backlog item rather than a
completion — consistent with how this session has always treated a "safe win that turns
out not to work" (don't ship indirection for zero measured benefit).

**Files actually changed**: `apps/web/src/components/page/page-view.tsx` (3 dynamic
imports), `apps/web/src/components/database/database-page-header.tsx` (1 dynamic
import), `apps/web/src/components/page/share-dialog.tsx` (request-id guard on
`handleInvite`). `public-page-view.tsx` and `packages/editor/*` are unchanged from
Phase 0.

**Verified**: `pnpm typecheck`/`pnpm lint` clean after each edit; `next build` route
table + `app-build-manifest.json` + chunk-content grep confirmed the three dialogs
genuinely split out; `pnpm -r test` 46/46; `pnpm test:integration` 10/10; full Playwright
suite 19/19 (including `realtime-collaboration.spec.ts` and `public-share.spec.ts`, both
green — the reverted public route and the untouched collab state machine behave exactly
as before); `react-doctor --scope changed` re-run, confirmed the one new finding fixed
and no other new findings beyond the already-documented backlog.

**Backlog note**: shrinking the public `/share/[token]` route's bundle by keeping
Yjs/Hocuspocus out of it entirely remains a real, measured opportunity (~370KB), but
needs an async-extension-loading restructure of `packages/editor/src/kit.ts` +
`block-editor.tsx`'s mount flow to do safely — out of scope for this pass.

### Phase 9 — Performance: memoization ✅ DONE

**`PageTreeItem`** (`page-tree-item.tsx`): wrapped in `React.memo`. The recursive render
of its own children previously passed an inline `onArchived={async () => {...}}` —
recreated on every render, which would have silently defeated the memo for every nested
item every time. Extracted it into a `useCallback`-stabilized `refreshChildren` (deps:
`workspaceId`, `node.id`). At the top level, `page-tree.tsx`'s `onArchived={refresh}` was
already a stable `useCallback` — no change needed there. The concrete payoff: dragging a
page over another row fires `handleDragOver` → `setDropPosition` on every mousemove,
re-rendering that row; without memo, that would also unconditionally re-render its entire
subtree of already-expanded children on every one of those events. `node` object identity
was confirmed stable across unrelated re-renders (state setters in `page-tree.tsx`/
`page-tree-item.tsx` only replace the specific item that actually changed, never the
whole array/object graph), so the memo has real unrelated-re-renders to skip.

**`TableView`/`BoardView`**: extracted the previously-inline per-row JSX into memoized
`TableRow`/`BoardCard` components. This took more than adding `React.memo` at the call
site to actually pay off, because of one specific trap: both views received a single
shared `getValue(rowId, propertyId)` closure from `database-view.tsx`, and passing that
same closure into every row as a prop means *any* cell changing *anywhere* in the table
gives every row a "changed" prop, defeating row-level memoization entirely regardless of
`React.memo`. Root cause traced to `handleSetValue`'s existing `valueIndex` update, which
was already carefully structured (a comment on `indexValues` already noted the "O(1)
lookup" intent) to replace only the changed row's own inner `Map` — so switching
`TableRow`/`BoardCard` to receive `values: Map<string, unknown> | undefined` (a direct
`valueIndex.get(row.id)` lookup, not a shared function) instead of `getValue` lets every
*other* row keep an identical prop reference across an edit. Also memoized
`otherProperties`/`cardProperties` in the parent views (previously recomputed via
`.filter()` on every render — a fresh array every time would have broken the memo just as
badly as the shared closure did) and hoisted `BoardView`'s inline
`onCreateOption={async (name) => ({...})}` stub to module scope for the same reason.
`database-view.tsx`'s `handleSetValue`, `handleTitleChange`, `handleAddRow`, `openRow`,
`handleRenameProperty`, `handleDeleteProperty` were wrapped in `useCallback`;
`handleCreateOption` too, though it necessarily depends on `properties` (needs the
current option list) so it's only as stable as the properties list — still a real win
since the hot path (editing rows/values) never touches `properties`. `CalendarView`/
`ListView` were left untouched (not in scope, and `CalendarView` still legitimately needs
the shared `getValue` since it doesn't render one row-component per cell the same way).

**Files**: `apps/web/src/components/sidebar/page-tree-item.tsx`,
`apps/web/src/components/database/table-view.tsx`,
`apps/web/src/components/database/board-view.tsx`,
`apps/web/src/components/database/database-view.tsx` (prop plumbing:
`getValue` → `valueIndex` passed to Table/Board views, plus the `useCallback` wraps
above).

**Verified**: `pnpm typecheck && pnpm lint` clean; `pnpm -r test` 46/46;
`pnpm test:integration` 10/10; full Playwright suite 19/19 after rebuilding, including
`database.spec.ts` (create property, add row, set values, switch to board — directly
exercises the changed row-rendering path) and `database-calendar-and-filters.spec.ts`;
`react-doctor --scope changed` re-run — score unchanged at 66/100, identical backlog, no
new findings from any of the four changed files.

### Phase 10 — Motion: targeted micro-interactions (last) ✅ DONE

**Toggle-block expand/collapse** (`packages/editor/src/nodes/toggle.tsx`): first
implementation used `motion.div` animating `height` between `0` and `"auto"`. Measured
its actual cost with the same `app-build-manifest.json` + chunk-size technique from
Phase 8 and found a real regression it caused: `motion` becoming a dependency of
`packages/editor` pulled it into every route rendering a `BlockEditor` — including the
**public, read-only `/share/[token]` route**, which grew 346KB → 386KB, undoing part of
Phase 8's work. Root cause: this file is reachable from every editor consumer, including
ones that render nothing else with motion, so a library import here can't be scoped away
the way it can in an app-level component. Fixed by dropping `motion` from this file
entirely and using a pure CSS technique instead — a `grid-template-rows: 0fr ↔ 1fr`
transition on a wrapper `div`, which animates to/from the content's real height without
ever needing to measure it (`height: auto` can't be transitioned in CSS directly, this
sidesteps that). Rebuilding confirmed `/share/[token]` back to 347KB (noise-level vs. the
Phase 8 baseline). Also removed `motion` from `packages/editor/package.json` entirely —
nothing there uses it any more. `inert` (not `display:none`) removes the collapsed
content from the tab order/a11y tree while it stays mounted (still the live,
always-mounted ProseMirror-editable region — see the file's own doc comment); the
transition duration is already covered by the existing app-wide
`prefers-reduced-motion` rule in `globals.css` (forces all transition/animation
durations to ~0), so no extra JS handling was needed here.

**Sidebar drag lift/settle** (`page-tree-item.tsx`): added `isDragging` state (`true`
between native `dragstart`/`dragend`) driving a small `scale`/`opacity` animation on the
row plus a `shadow-md` while dragging — a "picked up" cue, layered on top of (not
replacing) the existing shadow-based drop-*target* indicator, which is unrelated and
untouched. One real snag: motion's own `onDragStart`/`onDragEnd` prop types are for its
pointer-based `drag` gesture system, not native HTML5 `dataTransfer`-based drag events,
so they can't live on the same element as the native `draggable`/`onDrag*` handlers this
component already uses. Fixed by keeping the native handlers on a plain wrapping `div`
and putting the animated element one level in, rather than fighting the type system or
switching to motion's own (much larger, gesture-tracking) drag system for no reason.

**Comments panel open/close** (`comments-panel.tsx` + `page-view.tsx`): this panel
previously used `if (!open) return null` — an instant pop with no transition at all, not
"a CSS transition to measurably beat." Real, missing motion, and a real place for
`AnimatePresence` to add value (unlike the mobile drawer below). Moved the open/close
decision from inside the component to its call site
(`{comments.open ? <CommentsPanel key="comments-panel" .../> : null}` wrapped in
`<AnimatePresence>` in `page-view.tsx`) since `AnimatePresence` needs an actual
mount/unmount to detect in order to run an exit animation — a component that
internally returns `null` gives it nothing to animate. The panel itself is now a small
12px slide + fade, ~160ms.

**Mobile drawer** (`app-shell.tsx`): investigated and deliberately left alone. It's
always mounted (translated off-screen via CSS `transform`/`opacity`, never
conditionally rendered), already has a working CSS transition, and never needs an exit
animation before unmounting because it never unmounts — exactly the scenario
`AnimatePresence` doesn't add anything for. Converting it to motion would have been
rewriting working code with no measurable benefit, which the plan's own Karpathy-derived
guidance says not to do.

**`use-lazy-motion` (bundle-size rule)**: `react-doctor`'s design scan flagged both
`page-tree-item.tsx` and `comments-panel.tsx` for importing the full `motion` component
instead of the smaller, code-splittable `m` component. Fixed per the rule's own
documented remediation: added one `<LazyMotion features={domAnimation}>` provider in
`app-shell.tsx` (the shared ancestor of both the sidebar and the page view — the
`AppShell` component itself, not the root layout, since the public share/database
routes render outside it and use no motion at all either way) and switched both
components to `m.div`/`m.aside` from `"motion/react-m"`, reading the animation engine
from that provider instead of bundling it per-component. `domAnimation` (not the larger
`domMax`) is sufficient since nothing here uses motion's own drag/pan/layout-projection
system — the sidebar's drag-and-drop is native HTML5, not motion's `drag` prop.

**`prefer-motion-transform-property` (design scan, investigated and rejected)**: flagged
`x`/`scale` used as separate animate properties instead of one combined `transform`
string, for the same two files. Investigated per the rule's own validation
requirements: it's explicitly opt-in, "evidence-required," and its own fix prompt says
"do not rewrite healthy Motion code based on syntax alone" absent a production trace
showing main-thread contention. Both animations here are one-shot, ~120–160ms,
user-action-triggered (a drag start, a panel open) — not continuous or scroll-linked,
where the concern would actually matter. No such trace exists or is plausible to obtain
for interactions this small. Rejected rather than mechanically "fixed," consistent with
how `no-ref-current-in-render`'s tool limitation was handled in Phase 2/7: investigate
before rewriting, don't rewrite to satisfy a rule with no supporting evidence.

**New backlog item surfaced (not introduced by this session's changes, verified)**:
`no-high-complexity-react-function` fired on `PageTreeItem` alongside three files this
session never touched in a complexity-relevant way (`DatabaseView`, `PropertyCell`,
`PageView`) — checked what Phase 9/10 actually added to `PageTreeItem`
(`isDragging`/`handleDragEnd`, `refreshChildren`, `reducedMotion`) and confirmed those
add at most one new branch total; the flagged complexity (18 cyclomatic) is
overwhelmingly pre-existing (the component's five-plus drag/menu/CRUD handlers predate
this session). A genuine decomposition of a working, fully-tested component into smaller
pieces is a real but separate refactor, out of proportion to fold into "add a
micro-interaction" — logged as backlog rather than attempted under time pressure.

**Files**: `packages/editor/src/nodes/toggle.tsx`, `packages/editor/package.json` (removed
`motion`), `apps/web/src/components/sidebar/page-tree-item.tsx`,
`apps/web/src/components/page/comments-panel.tsx`,
`apps/web/src/components/page/page-view.tsx`, `apps/web/src/components/app-shell.tsx`,
`apps/web/package.json` (added `motion`).

**Verified**: `pnpm typecheck && pnpm lint` clean; `pnpm -r test` 46/46;
`pnpm test:integration` 10/10; full Playwright suite 19/19 after rebuilding (including
`realtime-collaboration.spec.ts`, `public-share.spec.ts`, and
`block-comments-and-mentions.spec.ts`, which exercises toggle-adjacent editor content);
`next build` bundle check confirmed `/share/[token]` back at the Phase 8 baseline (347KB)
after the toggle.tsx fix, with the editor route's own +4KB being genuine `LazyMotion`
weight for real functionality, not waste; `react-doctor design --verbose` reduced from 0
to 2 issues (both investigated and rejected above) after the initial motion.div
implementation, then back down after the `LazyMotion` fix — the
`no-layout-property-animation` finding from the first `toggle.tsx` attempt confirmed
fully cleared by the CSS rewrite. (One environment note: `react-doctor`'s score/summary
computation returned "Score unavailable... maintainability checks failed" consistently
across repeated full and `--scope changed` runs at this point in the session — a
tool-side issue, not something in this codebase; the individual rule findings it did
return are unaffected and were reviewed as normal.)

**Security fix found via this phase's `pnpm audit` pass (not part of the original Phase
10 scope, but surfaced while verifying it)**: a new advisory,
[GHSA-cp6q-959q-f8rh](https://github.com/advisories/GHSA-cp6q-959q-f8rh) — Tiptap's
`mergeAttributes()` turns an own `__proto__` key into an inherited, executable prototype
mutation. `@tiptap/core` reaches this app at v2.27.2 (pinned across ~15 `@tiptap/*`
packages plus `@hocuspocus/transformer`), and the fix requires `>=3.30.4` — a major
version migration with real breaking changes, far outside this phase's scope to attempt
safely. Investigated whether it's actually reachable rather than filing it away like the
dev-tool-only PostCSS/esbuild advisories: `saveDocumentSchema`
(`packages/contracts/src/pages.ts`) validated document content with only
`typeof v === "object" && v !== null` — no structural checking at all — and that
content is later fed to `@hocuspocus/transformer`'s `toYdoc()` on the realtime server
(`apps/realtime/src/server.ts`). That means an attacker doesn't need the editor UI or
any Tiptap-side interaction at all: a hand-crafted `saveDocumentAction` request with a
poisoned `attrs.__proto__` key would reach the vulnerable code path server-side. Fixed
the actually-reachable path without touching Tiptap: added a `hasDangerousKey()`
recursive check (`packages/contracts/src/json-content.ts`) rejecting `__proto__`/
`constructor`/`prototype` keys anywhere in submitted content, wired into
`saveDocumentSchema`'s validator, with 6 new unit tests (`json-content.test.ts`) — using
`JSON.parse` to construct the poisoned test fixtures rather than object-literal syntax,
since `{ __proto__: ... }` as source code triggers the property *setter* instead of
creating the plain data property a real JSON request body (and the vulnerability itself)
actually produces. The separate, much lower-likelihood path — a malicious authenticated
collaborator crafting raw Yjs protocol messages directly (bypassing the editor UI and
this schema entirely) to reach the same Tiptap bug — is not closed by this fix; recorded
as an accepted residual risk in `docs/SECURITY.md` alongside the existing PostCSS/esbuild
entries, for the same reason a full Tiptap v3 migration is out of scope here.

### Final gate ✅ DONE

| Check | Phase 0 baseline | Final |
| --- | --- | --- |
| React Doctor full scan | Score 41/100 — Critical, 98 issues (1 security error, 24 maintainability, 38 bugs, 26 accessibility, 9 performance) | 37 issues (2 bugs errors, 16 bugs warnings, 5 maintainability, 8 accessibility, 6 performance) — every remaining item individually reviewed below; no numeric score this run (see tool caveat) |
| React Doctor design scan | 77 issues, no score | 2 issues (both `prefer-motion-transform-property`, an opt-in evidence-required rule — investigated and rejected in Phase 10, not silently left) |
| `pnpm audit` | 15 vulnerabilities | 6 (4 moderate, 2 high) — see below |
| `pnpm typecheck` | — | 8/8 packages clean |
| `pnpm lint` | — | clean |
| `pnpm -r test` (unit) | — | 52/52 (was 46 at Phase 9; +6 from Phase 10's prototype-pollution guard) |
| `pnpm test:integration` | — | 10/10 |
| Playwright e2e | 17 tests | 19/19 (2 added in Phase 6) |

**React Doctor tool caveat**: both the full and `--scope changed` scans consistently
returned "Score unavailable... Results are incomplete: maintainability checks failed"
across every run at this point in the session (retried twice) — a tool-side issue, not
something in this codebase; the individual rule findings both scans *did* return are
complete and were reviewed normally. The 98→37 full-scan issue-count comparison is
apples-to-apples (both are full scans of the same 193 files, not `--scope changed`), so
it stands as a real, if not numerically-scored, measure of overall improvement.

**Full-scan findings review** — every item in the final 37, confirmed either
already-documented backlog (Phase 7's original list, still accurate) or a specific,
individually-reasoned decision made in a later phase:

- `no-derived-useState` ×3, `no-placeholder-only-field` ×5, `no-autofocus` ×3,
  `js-combine-iterations` ×3, `js-set-map-lookups` ×2, `only-export-components` ×1,
  `rerender-state-only-in-handlers` ×1, `nextjs-no-img-element` ×4 — the original Phase 7
  backlog, unchanged.
- `no-locale-format-in-render` ×3, `no-ref-current-in-render` ×2 (confirmed tool false
  positive, see Phase 2/7) — unchanged.
- `no-high-complexity-react-function` ×4 — new to a full-codebase view this session;
  investigated in Phase 10 and confirmed overwhelmingly pre-existing, not introduced by
  this session's edits (see that phase's write-up for the specific reasoning on
  `PageTreeItem`, the one function this session actually touched). Logged as backlog.
- `no-pass-live-state-to-parent`, `no-prop-callback-in-effect` (`block-editor.tsx`),
  `exhaustive-deps` ×2 (`comment-indicators.tsx`, `drag-handle.tsx`),
  `no-reset-all-state-on-prop-change`, `no-adjust-state-on-prop-change`
  (`slash-menu/menu-view.tsx`) — pre-existing findings in editor files this session never
  touched (visible only now because Phase 0's baseline was itself a full scan covering
  these same files, and this is the first full re-scan since — every phase's own
  verification deliberately used `--scope changed` to stay focused on that phase's
  diff). Out of scope for this pass; logged as backlog for a future dedicated pass over
  `packages/editor`'s non-toggle node views.

**`pnpm audit`**: 15 → 6. Phase 1 fixed the two critical/high CVEs (`next-auth`,
`drizzle-orm`); Phase 10 investigated and closed the actually-reachable path of a newly
surfaced one (`@tiptap/core` prototype pollution via `mergeAttributes()` — see that
phase's write-up and `docs/SECURITY.md`). The advisory itself still shows in `pnpm
audit`'s count (the `@tiptap/core` *version* is unchanged — fixing the version requires
a Tiptap v3 migration out of scope here; the validation fix closes the reachable
exploitation path without needing the version bump). The remaining 6 (PostCSS ×4,
esbuild ×1, the residual Yjs-protocol half of the Tiptap issue ×1) are all documented,
reasoned accepted-residual-risk entries in `docs/SECURITY.md`, not silently outstanding.

**Docs updated**: `docs/SECURITY.md` (Dependencies section — the Tiptap finding, the fix,
and its residual-risk half), `docs/TESTING.md` (unit 46→52 with the new test file
described, e2e 17→19 with the two Phase 6 tests described), `docs/NOTION_PARITY.md`
(reduced-motion row expanded to cover the JS-driven `useReducedMotion()` checks added
alongside the pre-existing CSS rule; new "Purposeful micro-interactions" row).

## 8. Consolidated verification commands

```
pnpm audit
npx react-doctor@latest --verbose                    # full scan
npx react-doctor@latest --verbose --scope changed    # after each phase's edits
npx react-doctor@latest design --verbose             # focused design audit
pnpm typecheck && pnpm lint
pnpm -r test
pnpm test:integration
pnpm --filter web build                              # bundle-size check (route sizes in output)
pnpm --filter web exec playwright test                # full e2e
```

## 9. Risks / must-preserve behavior

- **next-auth bump (Phase 1)**: must not break the Credentials-only, JWT-strategy setup
  — no OAuth providers are configured, so most of beta.32's breaking changes (OAuth
  cookie binding, OAuth 1.0 deprecation) don't apply here; verify by compiling
  `config.ts`/`edge-config.ts` and running the full auth e2e trio.
- **Realtime collaboration's sync-gating** (`hasSyncedOnce`, the bounded-timeout
  fallback to plain autosave — see `docs/ARCHITECTURE.md`'s realtime section) fixes two
  real bugs found this session. Phase 8's code-splitting must wrap the whole
  `useCollaboration` + Collaboration-extension unit as one boundary, never split it in a
  way that changes timing assumptions between "Y.Doc created" and "sync proven."
- **Stale-prop-copy fixes (Phase 2)** risk introducing real regressions if a flagged
  pattern was actually an intentional "seed local editable state once" (e.g.
  title-style uncontrolled-then-edited fields) — verify each of the 9 sites
  individually, don't batch-fix.
- **`exhaustive-deps` in drag-handle.tsx/comment-indicators.tsx (Phase 2)** carries
  outsized risk given this exact file's documented history (a serious, hard-to-detect
  interaction bug found only through real-pointer e2e testing, not code inspection or
  `element.click()`). Any dependency-array change here needs manual real-pointer
  verification, not just a green test suite.
- **Dead-dependency/export removal (Phase 4)** must be verified with a full clean
  install + build + test suite, not static analysis alone — Next.js server actions and
  workspace re-exports can have non-obvious consumers.
- **Design-scan mechanical fixes (Phase 7)** touch dozens of files but should be
  near-zero-risk as pure class-list edits with no structural JSX changes — still run the
  full e2e suite, since a class-list slip could silently shrink a click target.
- **Motion additions (Phase 10)** must never touch `block-editor.tsx`'s `onUpdate`/
  per-keystroke path — motion is for discrete state transitions only, never continuous
  typing feedback, to avoid the exact animation-jank/unnecessary-render category flagged
  in this plan's performance section.
- Throughout: **no new state-management library, no new abstraction layer, no
  restructuring of `apps/realtime`, the `packages/editor` schema/view split, or the
  server/action/domain layering** — all recent, deliberate, and already well-tested.
  Karpathy's "surgical changes, don't refactor what isn't broken" principle governs
  every phase.

## Proposed execution order

Phase 1 → Phase 2 → Phase 3 → Phase 4 → Phase 5 → Phase 6 → Phase 7 → Phase 8 → Phase 9
→ Phase 10 → Final gate. Each phase is independently shippable and independently
verifiable — this plan does not require all ten phases to land in one pass; stopping
after any phase leaves the app in a strictly better, fully-tested state than before it.
