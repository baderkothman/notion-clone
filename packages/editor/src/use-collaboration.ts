"use client";

import * as React from "react";
import * as Y from "yjs";
import { HocuspocusProvider, WebSocketStatus } from "@hocuspocus/provider";

export interface CollaborationUser {
  name: string;
  color: string;
}

export interface UseCollaborationOptions {
  /** False for read-only viewers (no edit permission) or when realtime isn't
   * configured for this deployment — the editor falls back to the plain
   * non-collaborative mode with no Y.Doc/socket created at all. */
  enabled: boolean;
  pageId: string;
  wsUrl: string;
  user: CollaborationUser;
  /** Mints a fresh short-lived join token; called on every (re)connection attempt,
   * since tokens expire in ~60s — see apps/web's mintRealtimeTokenAction. Rejecting
   * (e.g. the permission check failing) surfaces as a "disconnected" status rather than
   * a thrown render error. */
  fetchToken: () => Promise<string>;
}

export type CollaborationStatus = "disabled" | "connecting" | "connected" | "disconnected";

export interface UseCollaborationResult {
  status: CollaborationStatus;
  ydoc: Y.Doc | null;
  provider: HocuspocusProvider | null;
  /** True once this Y.Doc has received a full initial sync from apps/realtime at least
   * once — i.e. it's known to hold the server's actual content, not just an empty doc
   * waiting to be filled. Latches permanently true on the first sync and never resets
   * on a later disconnect/reconnect: a reconnect resyncs (Yjs's CRDT merge is safe for
   * that), but this flag is specifically "has this doc ever been proven to reflect real
   * content", which a later disconnect doesn't undo. Callers MUST NOT treat a Y.Doc as a
   * safe content source (or switch an editor onto it) until this is true — an unsynced
   * doc is indistinguishable from an empty page, and editing it would silently discard
   * whatever the server actually has. See page-view.tsx's `collabReady`. */
  hasSyncedOnce: boolean;
  /** Other participants currently in the room, from Yjs awareness — excludes the local
   * user. Renders as the presence avatar stack; cursors/selections are drawn by the
   * CollaborationCursor extension itself (see kit.ts), not from this list. */
  connectedUsers: CollaborationUser[];
}

interface AwarenessState {
  clientId: number;
  user?: CollaborationUser;
}

/** Owns the Y.Doc + HocuspocusProvider for one page's collaboration room. The external
 * session is created and destroyed in an effect so React Strict Mode's setup/cleanup
 * replay cannot leave state pointing at a provider it already destroyed. PageView does
 * not mount the collaborative BlockEditor until `hasSyncedOnce`, so the provider is
 * always available before the editor builds its frozen-at-mount extension list. */
export function useCollaboration({ enabled, pageId, wsUrl, user, fetchToken }: UseCollaborationOptions): UseCollaborationResult {
  const [session, setSession] = React.useState<{ ydoc: Y.Doc; provider: HocuspocusProvider } | null>(null);
  const [status, setStatus] = React.useState<CollaborationStatus>(enabled ? "connecting" : "disabled");
  const [hasSyncedOnce, setHasSyncedOnce] = React.useState(false);
  const [connectedUsers, setConnectedUsers] = React.useState<CollaborationUser[]>([]);

  React.useEffect(() => {
    if (!enabled) return;
    let active = true;
    const ydoc = new Y.Doc();
    const provider = new HocuspocusProvider({
      url: wsUrl,
      name: pageId,
      document: ydoc,
      token: fetchToken,
      // Constructor callbacks are registered before the provider's automatic first
      // connection, so a fast localhost handshake cannot outrun React's subscription.
      onStatus: ({ status: next }) => {
        if (active) setStatus(next === WebSocketStatus.Connected ? "connected" : "connecting");
      },
      onDisconnect: () => {
        if (active) setStatus("disconnected");
      },
      onSynced: ({ state }) => {
        if (active && state) setHasSyncedOnce(true);
      },
      onAwarenessUpdate: ({ states }: { states: AwarenessState[] }) => {
        if (!active) return;
        setConnectedUsers(
          states
            .map((state) => state.user)
            .filter((candidate): candidate is CollaborationUser => !!candidate && candidate.name !== user.name),
        );
      },
    });
    provider.setAwarenessField("user", user);
    setSession({ ydoc, provider });

    return () => {
      active = false;
      provider.destroy();
      ydoc.destroy();
    };
    // Intentionally mount-only (see doc comment): changing one of these values requires
    // a fresh room session, and PageView itself remounts when the page route changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, ydoc: session?.ydoc ?? null, provider: session?.provider ?? null, hasSyncedOnce, connectedUsers };
}
