import { Hocuspocus } from "@hocuspocus/server";
import { TiptapTransformer } from "@hocuspocus/transformer";
import jwt from "jsonwebtoken";
import { db, documents, eq, sql } from "@notion-clone/database";
import { createSchemaExtensions, EMPTY_TIPTAP_DOC } from "@notion-clone/editor/schema";
import type { RealtimeTokenPayload } from "@notion-clone/contracts";

// One schema, shared by every toYdoc/fromYdoc call this process makes — see
// createSchemaExtensions()'s doc comment for why this must exactly track the browser
// editor's node/mark definitions (kit.ts) or custom blocks would silently lose their
// attrs (or fail to parse at all) when converted to/from a Yjs document.
const transformer = TiptapTransformer.extensions(createSchemaExtensions());

// Documents are named by page id (the client passes `name: pageId` — see
// use-collaboration.ts) and stored under Yjs's "default" fragment, matching the
// Collaboration extension's own default field name.
const YJS_FIELD = "default";

function getJwtSecret(): string {
  const secret = process.env.REALTIME_JWT_SECRET;
  if (!secret) throw new Error("REALTIME_JWT_SECRET is not set.");
  return secret;
}

function getPort(): number {
  const port = Number(process.env.REALTIME_PORT ?? 1234);
  if (!Number.isInteger(port) || port <= 0) throw new Error("REALTIME_PORT must be a positive integer.");
  return port;
}

const server = new Hocuspocus({
  port: getPort(),

  // Debounce persistence instead of writing to Postgres on every keystroke — mirrors
  // the autosave path's own debounce (use-autosave.ts's 800ms default), just tuned
  // slightly looser server-side since there's no per-client "flush before navigating
  // away" here; maxDebounce bounds how long a busy room can go without a write.
  debounce: 1000,
  maxDebounce: 4000,

  /**
   * The only gate on joining a room: a client that merely knows a page's UUID is
   * refused. Only a token minted by `apps/web`'s `mintRealtimeToken` — which runs a
   * real `assertPagePermission(userId, pageId, "edit")` check first — is accepted, and
   * it's checked fresh on every single connection (including reconnects), so a
   * permission change takes effect within the token's ~60s lifetime rather than only at
   * next page load. See docs/ARCHITECTURE.md's "Real-time collaboration architecture".
   */
  async onAuthenticate({ token, documentName, connection }) {
    let payload: RealtimeTokenPayload;
    try {
      payload = jwt.verify(token, getJwtSecret()) as RealtimeTokenPayload;
    } catch {
      throw new Error("Invalid or expired realtime token.");
    }
    if (payload.pageId !== documentName) {
      throw new Error("Token does not authorize this document.");
    }
    // Tokens are only ever minted for "edit"-role holders today (see mint-token.ts),
    // but honor a weaker role if one ever shows up rather than assuming it can't.
    if (payload.role !== "edit") {
      connection.readOnly = true;
    }
    // Merged into every later hook's `context` for this connection (onLoadDocument,
    // onStoreDocument, onDisconnect, ...).
    return { userId: payload.userId, role: payload.role };
  },

  /** Seeds a fresh in-memory Yjs doc from `documents.content` the first time a page's
   * room is opened after the server starts (or after every connection has left and the
   * room was unloaded) — Hocuspocus keeps subsequent edits in memory and only calls back
   * into Postgres via onStoreDocument, so this never re-reads on every reconnect while
   * the room stays warm. */
  async onLoadDocument({ documentName }) {
    const [row] = await db.select({ content: documents.content }).from(documents).where(eq(documents.pageId, documentName)).limit(1);
    return transformer.toYdoc(row?.content ?? EMPTY_TIPTAP_DOC, YJS_FIELD);
  },

  /** The one place Yjs's merged CRDT state is written back to `documents.content` —
   * converted to the same Tiptap JSON shape the non-realtime autosave path
   * (save-document.ts) writes, so both converge on one source of truth. `version` is
   * still bumped even though nothing here checks it: that's what makes a stale
   * autosave from a client that was mid-reconnect correctly fail save-document.ts's
   * optimistic-concurrency check instead of silently clobbering what collaborators just
   * wrote — see documents.ts's schema comment. */
  async onStoreDocument({ document, documentName, context }) {
    const content = transformer.fromYdoc(document, YJS_FIELD);
    await db
      .update(documents)
      .set({
        content,
        version: sql`${documents.version} + 1`,
        updatedByUserId: (context as { userId?: string }).userId ?? null,
        updatedAt: new Date(),
      })
      .where(eq(documents.pageId, documentName));
  },
});

server.listen();
