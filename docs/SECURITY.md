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

No dependency was pinned to a version with a known critical/high CVE at the time of
writing. `pnpm audit` should be run periodically (not wired into CI in this pass — see
`docs/TESTING.md` for what CI coverage exists today).

## What was not implemented

- CSRF: Next.js Server Actions carry Origin-header verification built in (rejecting
  cross-origin POSTs) as of the Next.js version pinned here; no additional custom CSRF
  token layer was added on top since none of the mutating routes are plain form posts to
  a non-Next.js-managed endpoint.
- A dedicated security-headers/dependency scan in CI — not set up in this pass (no CI
  pipeline exists yet at all; see `docs/TESTING.md`).
- The SSRF DNS-rebinding TOCTOU gap noted above.
