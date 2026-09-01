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

/**
 * Owns the Y.Doc + HocuspocusProvider for one page's collaboration room. Constructed
 * synchronously on mount (not inside an effect) so both already exist by the time
 * `BlockEditor` builds its (frozen-at-mount) extension list — see block-editor.tsx.
 * Callers must remount this (e.g. `key={pageId}`) if the page being edited changes,
 * since `pageId`/`enabled` are only read once per mount, matching how `BlockEditor`
 * itself treats its extension-affecting props.
 */
export function useCollaboration({ enabled, pageId, wsUrl, user, fetchToken }: UseCollaborationOptions): UseCollaborationResult {
  const [ydoc] = React.useState<Y.Doc | null>(() => (enabled ? new Y.Doc() : null));
  const [provider] = React.useState<HocuspocusProvider | null>(() =>
    enabled && ydoc ? new HocuspocusProvider({ url: wsUrl, name: pageId, document: ydoc, token: fetchToken }) : null,
  );
  const [status, setStatus] = React.useState<CollaborationStatus>(enabled ? "connecting" : "disabled");
  const [hasSyncedOnce, setHasSyncedOnce] = React.useState(false);
  const [connectedUsers, setConnectedUsers] = React.useState<CollaborationUser[]>([]);

  React.useEffect(() => {
    if (!provider) return;
    provider.setAwarenessField("user", user);

    function handleStatus({ status: next }: { status: WebSocketStatus }) {
      setStatus(next === WebSocketStatus.Connected ? "connected" : "connecting");
    }
    function handleDisconnect() {
      setStatus("disconnected");
    }
    function handleSynced({ state }: { state: boolean }) {
      if (state) setHasSyncedOnce(true);
    }
    function handleAwarenessUpdate({ states }: { states: AwarenessState[] }) {
      setConnectedUsers(
        states
          .map((s) => s.user)
          .filter((candidate): candidate is CollaborationUser => !!candidate && candidate.name !== user.name),
      );
    }

    provider.on("status", handleStatus);
    provider.on("disconnect", handleDisconnect);
    provider.on("synced", handleSynced);
    provider.on("awarenessUpdate", handleAwarenessUpdate);

    return () => {
      provider.off("status", handleStatus);
      provider.off("disconnect", handleDisconnect);
      provider.off("synced", handleSynced);
      provider.off("awarenessUpdate", handleAwarenessUpdate);
      provider.destroy();
      ydoc?.destroy();
    };
    // Intentionally mount-only (see doc comment): `provider`/`ydoc` are already frozen
    // by the lazy useState initializers above, and re-running this on every `user`
    // change would tear down and reconnect the whole session just to update a name.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [provider]);

  return { status, ydoc, provider, hasSyncedOnce, connectedUsers };
}
