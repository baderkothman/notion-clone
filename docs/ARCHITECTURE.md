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

## Future Product Extensions

This document describes the Phase 1 Notion-clone foundation only. Additional
differentiating features for the product will be scoped and documented in a future
phase — none are included here by design.
