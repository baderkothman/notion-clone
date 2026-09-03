# Architecture

## Monorepo layout

```
apps/
  web/            Next.js 15 App Router — routes, server actions, UI composition
  realtime/        Hocuspocus WebSocket server for collaborative editing
packages/
  contracts/       Zod schemas + shared TS types — the cross-module contract surface
  database/        Drizzle schema, migrations, typed client, domain-agnostic exports
  auth/            Auth.js config, password hashing — isolated & swappable
  editor/          Tiptap extensions, block schema, slash menu, autosave hook
  ui/              Design tokens + shared React components
  shared/          Cross-cutting utilities (ids, errors, Result, rate limiting, sort keys)
```

Domain logic (permissions, page hierarchy, sharing, comments, databases, files, history)
lives under `apps/web/src/server/<domain>/`, one directory per bounded area from the
capability map (`tasks/capability-map.md`). Each domain module:

- exports plain async functions taking `(userId, input)`, never a request/response object
- validates its input with a Zod schema from `packages/contracts`
- calls into `src/server/permissions` for every authorization decision — no domain
  module re-implements a role check inline
- is wrapped by a `"use server"` action in `apps/web/src/app/(app)/actions/<domain>.ts`
  that resolves the session, calls the domain function, and converts thrown
  `DomainError`s into a serializable `{ ok, error, code }` result (see
  `src/server/action-result.ts` — Next.js redacts thrown server-action errors in
  production, so this is how user-facing messages actually reach the client)

React Server Components fetch data by calling domain modules directly (no HTTP hop);
Client Components call the `"use server"` actions. UI components never talk to the
database or import `@notion-clone/database` directly — `import "server-only"` at the top
of every domain module enforces this at build time.

## Why this shape

- **Contracts package as the seam.** `packages/contracts` has no dependency on the
  database, Next.js, or React. It's what a module's *interface* looks like — page
  hierarchy operations, permission roles, database property types — decoupled from how
  any one module implements against it. This is what `improve-codebase-architecture`
  calls a deep module: a small, stable interface in front of real complexity (recursive
  CTEs, optimistic concurrency, S3 presigning) that lives entirely in `apps/web/src/server`.
- **One permission-resolution function.** `src/server/permissions/resolve.ts` walks a
  page's ancestor chain once (a single recursive SQL query) and hands the result to a
  pure, unit-tested decision function (`resolve-core.ts`). Every route/action calls
  `assertPagePermission` — there is no second code path that decides access.
- **Blocks live outside the page-tree table.** `documents` (block content) is a separate
  table from `pages` (hierarchy metadata) so the autosave hot path — which writes on
  every debounce tick — never contends with sidebar/breadcrumb queries, and vice versa.
- **Realtime is a separate process, not a Next.js route.** `apps/realtime` is a
  long-lived WebSocket server; Next.js's request/response model isn't the right host for
  that lifecycle. It shares `packages/database` and `packages/contracts` with the web
  app instead of duplicating permission logic.

## Why Node.js middleware isn't used here

`src/middleware.ts` runs on the Edge runtime and uses the JWT session strategy (not
Auth.js's "database" strategy) specifically so the per-request auth check in middleware
never needs a Postgres round-trip. See `packages/auth/src/config.ts` for the tradeoff
this makes explicit (no server-side "sign out everywhere" — bounded by token `maxAge`
instead). If that tradeoff becomes unacceptable, the fix is to move the auth check out of
middleware into each route/layout (where Node.js APIs are always available) rather than
reaching for Node.js middleware.

## Real-time collaboration architecture

- `apps/realtime` runs [Hocuspocus](https://tiptap.dev/docs/hocuspocus), a Yjs-based
  collaboration server, as its own Node process (`pnpm --filter realtime dev`).
- A client that wants to join a page's collaboration room first calls a server action in
  `apps/web` that verifies the requester's permission on that page
  (`assertPagePermission(userId, pageId, "edit")`) and mints a short-lived signed token
  (JWT, `REALTIME_JWT_SECRET`) binding `{ userId, pageId, role }`.
- The Hocuspocus server's `onAuthenticate` hook verifies that token on every connection
  attempt — a client that merely knows a page's UUID is refused; only a token minted by
  the authorization check above is accepted. Tokens are short-lived (60s) so a leaked
  token has a small blast radius and reconnecting always re-checks current permissions.
- Document state is Yjs CRDT updates, persisted by Hocuspocus's `onStoreDocument` hook
  back into `documents.content` (converted to the same Tiptap JSON shape the
  autosave/version path uses), so the realtime and non-realtime editing paths converge on
  one source of truth instead of two.
- Presence (who's viewing/editing) rides on Yjs awareness, which Hocuspocus provides
  out of the box; the editor renders collaborator cursors/avatars from awareness state.
- A fresh Y.Doc starts empty, and is indistinguishable from "this page has no content"
  until it's actually synced with apps/realtime. `page-view.tsx` never mounts the editor
  onto an unsynced Y.Doc — it renders in plain mode (reading `documents.content` exactly
  as if realtime didn't exist, autosave-owned) until `useCollaboration`'s `hasSyncedOnce`
  is true, then switches. If sync never completes within a few seconds (apps/realtime
  down, network trouble, `REALTIME_URL` misconfigured), it gives up and stays in plain
  mode rather than showing a permanent loading state or — the two failure modes an
  earlier version of this actually hit during development — silently editing an empty
  document that would overwrite real content on save, or suppressing autosave forever
  because a `"connecting"` status was mistaken for "safe to skip the fallback."
  `apps/web/src/server/realtime/mint-token.ts` and `packages/editor/src/use-collaboration.ts`
  are the two places this contract lives; see their doc comments before changing either.
- `packages/editor/src/schema.ts` exports the document schema with zero
  `react`/`react-dom` in its import graph — every custom node is split into a plain
  `*-schema.ts` half (attrs/parseHTML/renderHTML/commands) and a `.tsx` half that
  `.extend()`s it with the React node view (see `nodes/toggle-schema.ts` +
  `nodes/toggle.tsx`). apps/realtime imports only the schema half (via
  `@notion-clone/editor/schema`) to convert between Tiptap JSON and Yjs updates —
  reusing the same node/mark definitions the browser editor uses, so a custom block's
  attrs can never silently drift between the two processes.

## Search architecture

`packages/contracts` defines `SearchProvider`; `apps/web/src/server/search/postgres-search-provider.ts`
is the phase-1 implementation using Postgres `tsvector`/`ts_rank`, with permission
filtering done in the SQL `WHERE` clause itself (never post-filtered in application code
after the fact). A dedicated search engine can be introduced later by writing a new
class against the same interface — callers (the `searchAction` server action) don't change.

## File storage architecture

Files are never stored in Postgres. `apps/web/src/server/files/upload.ts` issues
presigned S3 PUT URLs (`packages/*` has no AWS SDK dependency — only `apps/web` does),
the browser uploads directly to the bucket, and the server confirms the object actually
landed (a HEAD request) with an allowed content type before the `files` row flips from
"pending" to "uploaded". Object keys are randomized and namespaced by workspace — never
derived from the client-supplied filename. See `docs/SECURITY.md` for the full threat
model.

## Calendar & Google Calendar sync (Phase 2)

The first differentiating feature beyond Notion parity: a workspace-level Calendar
(`/w/[slug]/calendar`) with its own first-class events, not the database-property
"Calendar view" (`database_views.type = 'calendar'`, unrelated — a way to lay an
*existing database's* rows onto a grid by a Date property). This is a deliberate product
bet: hosted Notion has no native calendar at all — a real, recurring complaint (see
`docs/PRODUCT_SPEC.md`'s "Positioning" note) — and it's a natural fit for a self-hosted
workspace that already owns its own data.

**Domain module**: `apps/web/src/server/calendar/` (events CRUD, workspace-scoped,
authorized via `ROLE_CAPABILITIES.useCalendar` — guests are excluded, matching their
existing page-scoped-only access model) plus
`apps/web/src/server/integrations/google-calendar/` (OAuth connect/disconnect, token
refresh, pull-sync, push-sync). Schema: `packages/database/src/schema/calendar.ts`
(`calendar_events`, `google_calendar_connections`).

**Google connection is scoped to one workspace, not just one user.** A Google account
is personal, but a pulled event has to land in a specific workspace's calendar, and
letting one connection feed multiple workspaces would make
`(googleConnectionId, googleEventId)` ambiguous the moment the same connection synced
from two workspaces. Connect from a workspace's Settings → Integrations; to use Google
Calendar with a second workspace, disconnect and reconnect from there (moves the
connection, since `userId` stays unique — see the schema's doc comment).

**OAuth flow** (`apps/web/src/app/api/integrations/google/{authorize,callback}/`):
real GET route handlers, not server actions — a top-level browser navigation to
Google's consent screen can't happen from a fetch-based action. `state` is a signed,
5-minute JWT (reusing `AUTH_SECRET`) binding `{userId, workspaceId}`, verified on
callback as CSRF protection and as the only source of which workspace the connection
belongs to (never trusted from a callback query param). `access_type: "offline"` +
`prompt: "consent"` are both required to actually receive a `refresh_token` on every
connect, including a reconnect after a revoke.

**Token storage**: AES-256-GCM-encrypted (`packages/shared/src/crypto.ts`,
`GOOGLE_TOKEN_ENCRYPTION_KEY` — a separate secret from `AUTH_SECRET` so rotating one
never touches the other), deliberately not using the Auth.js adapter's `accounts` table
(`schema/identity.ts`), which stores provider tokens in plaintext per the standard
adapter contract. `getAuthorizedClient()` (`google-calendar/client.ts`) refreshes and
re-persists the access token transparently before every API call; a refresh failure
(revoked grant) flips the connection to `status: "revoked"` with a user-facing message
instead of failing silently on every subsequent sync.

**Sync model** — one-directional per call, which is what keeps it loop-free:

- *Pull* (`google-calendar/sync.ts`): Google → `calendar_events` only, never triggers a
  push back. First sync pulls a ±30/180-day window; every sync after that uses Google's
  `syncToken` for a real incremental pull (only what changed), falling back to a full
  resync if Google returns 410 (an expired/invalidated token — Google's own documented
  behavior after a period of inactivity). Recurring events are pulled pre-expanded
  (`singleEvents: true`) rather than parsed from RRULEs ourselves. Upsert is keyed on
  `(googleConnectionId, googleEventId)` (a unique DB constraint), making a re-run of the
  same sync pass idempotent — the concrete "duplicate prevention" mechanism. A
  cancelled/deleted Google event becomes a local soft-delete (`deletedAt`), consistent
  with how the rest of the app treats deletion (pages' trash).
- *Push* (`google-calendar/push.ts`): local → Google only, and only from an explicit,
  synchronous user action (create/edit/delete an event with a connection selected) —
  never from a background job reacting to a pull. A push failure never fails the local
  write; it's recorded on the row (`syncStatus: "error"`, `syncError`) and surfaced in
  the UI, the same "local truth first, sync is best-effort" shape as autosave falling
  back when realtime is unavailable (see above).
- Sync is triggered by an explicit "Sync now" button and once inline right after
  connecting — there's no background job/cron/webhook infrastructure in this phase (no
  queue exists anywhere in this app; see `docs/PRODUCT_SPEC.md`'s Redis decision for the
  same reasoning). A real-time push-channel (Google Calendar's webhook subscriptions)
  needs a publicly reachable, domain-verified HTTPS endpoint — an external launch
  requirement, not something buildable/testable in this environment — and is the
  natural next increment once a deployment has one.

**Timezones/all-day/recurrence**: `startAt`/`endAt` are stored as `timestamptz` (always
UTC internally) plus a separate `timezone` (IANA name) field, mirroring Google's own
`dateTime+timeZone` vs. `date`-only (`allDay`) shapes so neither direction of sync is
lossy. Recurrence editing in this app's own UI is a bounded preset list (none/daily/
weekly/monthly, see `packages/contracts/src/calendar.ts`'s doc comment) resolved to a
real RFC 5545 `RRULE` string server-side — not a general recurrence-rule builder; a
documented scope cut, the same precedent as the database "person" property being
single-assignee-only (`docs/NOTION_PARITY.md`).

## Omniroute — evaluated and rejected

The task that produced this phase asked for an AI/model-routing library called
"Omniroute" to be integrated if it fit. It was researched, not integrated:

1. **No AI/LLM functionality exists anywhere in this codebase** (verified by grep —
   nothing references OpenAI/Anthropic/any model API). Introducing an AI provider
   gateway with nothing to gateway would be pure speculative infrastructure, directly
   against this project's own documented discipline (`docs/IMPROVEMENT_PLAN.md`'s
   Karpathy-derived principle: no abstraction the app doesn't need yet).
2. **The name doesn't resolve to one verifiable project.** It matches several distinct,
   near-identical repositories under unrelated GitHub accounts
   (`diegosouzapw/OmniRoute`, `pitbaden/omniroute`, `BunsDev/omniroute`) sharing
   verbatim descriptions, plus a differently-named `omnilabs-ai/OmniRouter` and a
   commercial site. Identical descriptions copy-pasted across unrelated forks with
   implausibly high star counts for an obscure tool is a recognizable supply-chain red
   flag, not a naming coincidence to shrug off.
3. Even setting aside (2), what's described (a local proxy process that intercepts and
   stores API keys) is a new runtime/process, not a library import — exactly the "new
   top-level dependency category" `docs/PRODUCT_SPEC.md`'s Boundaries says to ask about
   first, for a feature this app doesn't have a use for yet.

If/when this product grows an actual AI feature, evaluate a model-routing layer against
that feature's real requirements at that time, from a specific, verifiably-owned
repository — not speculatively.
