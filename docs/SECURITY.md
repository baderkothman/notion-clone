# Security

## Authorization model

Every protected operation validates this chain server-side, never trusting a
client-supplied ID's implied access:

```
authenticated user → workspace membership → resource permission → operation
```

- **Workspace membership** (`apps/web/src/server/permissions/workspace-role.ts`): a
  `workspace_members` row is the root of every decision. No row, no access — full stop.
- **Page permission** (`apps/web/src/server/permissions/resolve.ts` +
  `resolve-core.ts`): walks the page's ancestor chain in one recursive SQL query,
  then a pure, unit-tested function (`resolve-core.test.ts`, 9 cases) decides the
  effective role from: the page creator (always full) → explicit share on the page →
  explicit share on the nearest shared ancestor → workspace visibility on the page →
  workspace visibility on the nearest ancestor → deny. Guests never gain access through
  workspace visibility, only explicit shares.
- **`assertPagePermission(userId, pageId, minimum)`** (`permissions/assert.ts`) is the
  single call every domain module makes before acting; it throws `ForbiddenError` (never
  returns a boolean a caller could ignore).
- **Workspace-level capabilities** (invite members, change roles, etc.) go through
  `assertWorkspaceCapability`, backed by the `ROLE_CAPABILITIES` matrix in
  `packages/contracts/src/workspaces.ts` — one source of truth, not scattered role checks.

**Tested directly**: `apps/web/e2e/authorization.spec.ts` creates two independent
accounts/workspaces and verifies user B cannot open user A's private page by URL — the
exact "change `/page/abc` to another page ID" scenario from the top-level spec. It also
confirms the private page's content never appears in user B's response.

**Known scope decision**: workspace owners/admins do **not** automatically see other
members' private pages (unlike some "admin override" tools). This is intentional for
phase 1; an audit/compliance override is out of scope here.

## Tenant isolation

Every workspace-scoped table either carries `workspace_id` directly or is reached from
`pages.workspace_id` through exactly one join — see `docs/DATABASE.md` "Cross-workspace
isolation". Search results are filtered in the SQL `WHERE` clause itself
(`postgres-search-provider.ts`), not post-filtered in application code after the query
already ran.

## Input validation

Every server action/route parses its input with a Zod schema from `packages/contracts`
before touching the database (`schema.parse(raw)` — never `as` casts on client input).
TypeScript types alone are never treated as validation, since they don't survive past
compile time.

## XSS

Tiptap renders the document as real DOM nodes through ProseMirror's schema-constrained
rendering — never `dangerouslySetInnerHTML` on stored or pasted content. Pasted HTML is
parsed against the editor's schema (unknown tags/attributes are dropped, not preserved).
Bookmark previews render `title`/`description` as React text content (auto-escaped), not
HTML. `rel="noopener noreferrer nofollow"` is set on every externally-sourced link
(editor links, bookmark cards).

## SSRF (bookmark link previews)

`apps/web/src/server/embeds/ssrf-guard.ts` validates every user-supplied URL before the
server fetches it:

- protocol allowlist (`http`/`https` only)
- blocks `localhost`, loopback, link-local (including the `169.254.169.254` cloud
  metadata address), private ranges (10/8, 172.16/12, 192.168/16, carrier-grade NAT,
  multicast), and `::1`/ULA/link-local IPv6
- resolves the hostname and checks **every** returned address (not just the first), so a
  hostname that round-robins between a public and a private IP is still blocked
- re-validates the final URL after following redirects, so a public URL that 302s to a
  private address is caught
- 5-second fetch timeout, 512KB response cap

**Known residual risk**: there is a small window between the DNS-resolution check and the
actual `fetch()` call (classic TOCTOU/DNS-rebinding). Fully closing it means pinning the
resolved IP for the fetch itself (a custom `dns.lookup` override or resolved-IP + Host
header), which wasn't implemented in this pass — noted here rather than left silent.

## Sessions

- JWT strategy (not Auth.js's "database" strategy) — see `docs/ARCHITECTURE.md` "Why
  Node.js middleware isn't used here" for the tradeoff this makes explicit.
- Cookie: `httpOnly`, `sameSite: lax`, `secure` in production, 30-day `maxAge`.
- `middleware.ts` and `packages/auth/src/edge-config.ts` are the edge-safe half (no DB,
  no Node `crypto`); `packages/auth/src/config.ts` (Node-only) adds the real Credentials
  provider. Never import `config.ts` from middleware.

## Rate limiting

In-memory sliding-window limiter (`packages/shared/src/rate-limit.ts`), applied to:
sign-in (10/5min per email), sign-up (5/10min per email), password-reset requests
(3/15min per email), search (30/min per user), bookmark link-metadata fetches (20/min per
user). Explicitly scoped to a single-instance deployment for phase 1 — see
`docs/PRODUCT_SPEC.md`'s Redis decision for when to swap this for a shared store.

## File uploads

- Presigned S3 PUT URLs; the browser never sends file bytes through the Next.js server.
- MIME type allowlist (`packages/contracts/src/files.ts`) checked at both
  presign-request time **and** re-verified against the actual stored object's
  `Content-Type` at confirm time (`confirmUpload`) — a forged `Content-Type` header on
  the PUT doesn't slip an unexpected file type past the allowlist.
- Object keys are fully randomized (`newToken(16)`), never derived from the
  client-supplied filename, and namespaced under the workspace id.
- A `files` row starts `pending` and is never linked into rendered content until
  `confirmUpload` succeeds (a HEAD request against the bucket).
- Size limit enforced (25MB) at presign time.

## Password storage

bcrypt, cost factor 12 (`packages/auth/src/password.ts`). Minimum password length is 10
characters with no composition rules — OWASP's current guidance is that length matters
more than forced complexity, which tends to push users toward predictable patterns.

## Password reset

Reset tokens are random (32 bytes), hashed (SHA-256) before storage — the raw token is
never persisted, matching the invitation-token pattern. Requesting a reset always returns
the same response whether or not the email exists (no account enumeration via the
forgot-password form). Tokens are single-use (`usedAt`) and expire after 1 hour.

## Headers

Set in `next.config.ts` (static) and `middleware.ts` (per-request CSP with a nonce):
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
strict-origin-when-cross-origin`, `Permissions-Policy` (camera/mic/geolocation denied),
`Strict-Transport-Security` in production, and a `Content-Security-Policy` with no
`'unsafe-inline'` for scripts (the theme-init inline script uses a per-request nonce
instead) — `default-src 'self'`, explicit `connect-src` allowance for the S3 endpoint
(uploads PUT directly from the browser) and WebSocket origins.

## Dependencies

`pnpm audit` is run periodically (not wired into CI in this pass — see `docs/TESTING.md`
for what CI coverage exists today; see `docs/IMPROVEMENT_PLAN.md` for the audit that
found and fixed the below).

Two dependencies were found pinned to versions with known critical/high CVEs and were
upgraded:

- **`next-auth`** was on `5.0.0-beta.25`, vulnerable to (among others) two critical
  issues — auth checks failing open on a provider configuration error
  (GHSA-8fpg-xm3f-6cx3) and an email-normalizer homoglyph `@` bypass
  (GHSA-7rqj-j65f-68wh) — plus a high-severity uncaught exception in `getToken()` on a
  malformed Bearer header. Bumped to `5.0.0-beta.32` (the current patched release; v5 is
  still in beta upstream). This app only uses the Credentials provider (no OAuth), so
  the beta's other breaking changes (OAuth cookie provider-binding, OAuth 1.0
  deprecation) don't apply here.
- **`drizzle-orm`** was on `0.38.3`, vulnerable to a high-severity SQL injection via
  improperly escaped identifiers in `sql.identifier()`/`sql.as()` (fixed in `0.45.2`).
  This codebase never calls either function (verified by grep), so the actual
  exploitability was nil, but the version was bumped to `0.45.2` anyway (with
  `drizzle-kit` bumped to `0.31.10` to match) — verified with a full typecheck, the unit
  suite, all 10 integration tests against real Postgres, and the full Playwright suite.

A third finding — **`@tiptap/core` prototype pollution** (moderate,
[GHSA-cp6q-959q-f8rh](https://github.com/advisories/GHSA-cp6q-959q-f8rh):
`mergeAttributes()` turns an own `__proto__` key into an inherited, executable
prototype mutation) — reaches this app via `@hocuspocus/transformer` in
`apps/realtime` at `@tiptap/core@2.27.2`; the fix requires `>=3.30.4`, a major-version
migration across the ~15 `@tiptap/*` packages this app is pinned to, with real breaking
API changes. That migration was judged out of scope to attempt as a side effect of a
routine audit pass, but the actual reachable attack path was investigated and closed
rather than only documented: `saveDocumentSchema`
(`packages/contracts/src/pages.ts`) previously validated a saved page's document content
with nothing stronger than `typeof v === "object" && v !== null`, and that content is
later fed to `@hocuspocus/transformer`'s `toYdoc()` on the realtime server
(`apps/realtime/src/server.ts`) — meaning a hand-crafted `saveDocumentAction` request
carrying a poisoned `attrs.__proto__` key could reach the vulnerable code path without
the attacker ever touching the editor UI or Tiptap client-side at all. Fixed with a
`hasDangerousKey()` check (`packages/contracts/src/json-content.ts`, covered by
`json-content.test.ts`) rejecting `__proto__`/`constructor`/`prototype` keys anywhere in
submitted content, wired into `saveDocumentSchema`'s validator.

**Accepted residual risk** (effectively non-exploitable in this app's actual usage, or
requiring a disproportionately large fix relative to the risk):

- PostCSS (2 high, 2 moderate CVEs — arbitrary file read, path traversal, XSS via
  unescaped `</style>`) is bundled inside `next@15.5.25` itself, not a direct dependency
  here. All of these require processing *untrusted* CSS input; this app only ever
  processes developer-authored CSS at build time. Fixing this properly means bumping
  Next.js itself, which is a materially bigger, riskier change than a dependency-version
  bump and is out of scope for this pass — a candidate for its own dedicated,
  separately-tested phase later.
- `esbuild<=0.24.2` (moderate — a compromised dev-server request/response read) reaches
  this repo only via `drizzle-kit`'s deprecated transitive `@esbuild-kit/esm-loader`
  chain. `drizzle-kit` is a devDependency, run only locally for `db:generate`/
  `db:studio`, never shipped or executed in production.
- The remaining, harder-to-reach half of the Tiptap prototype-pollution issue above: a
  malicious *authenticated collaborator* (one who already has edit access to a page)
  crafting raw Yjs protocol messages directly over the realtime WebSocket — bypassing
  the editor UI, the client-side ProseMirror schema, and `saveDocumentSchema` entirely
  — could still reach the same underlying Tiptap bug via the live collaboration path.
  Closing this fully needs either the full Tiptap v3 migration or protocol-level attrs
  validation inside `apps/realtime`'s Hocuspocus hooks, both materially larger changes
  than this pass's scope; noted here rather than left silent, matching how the SSRF
  TOCTOU gap above is handled.

## What was not implemented

- CSRF: Next.js Server Actions carry Origin-header verification built in (rejecting
  cross-origin POSTs) as of the Next.js version pinned here; no additional custom CSRF
  token layer was added on top since none of the mutating routes are plain form posts to
  a non-Next.js-managed endpoint.
- A dedicated security-headers/dependency scan in CI — not set up in this pass (no CI
  pipeline exists yet at all; see `docs/TESTING.md`).
- The SSRF DNS-rebinding TOCTOU gap noted above.
