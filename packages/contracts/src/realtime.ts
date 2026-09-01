import type { ShareRole } from "./permissions";

/**
 * The payload of the short-lived JWT that authorizes a browser to join a page's
 * Hocuspocus collaboration room. Minted by `apps/web` (`server/realtime/mint-token.ts`)
 * only after `assertPagePermission(userId, pageId, "edit")` succeeds, and verified by
 * `apps/realtime`'s `onAuthenticate` hook on every connection — see
 * docs/ARCHITECTURE.md's "Real-time collaboration architecture" section. Both sides
 * import this one type so the shape can't drift between the two processes.
 */
export interface RealtimeTokenPayload {
  userId: string;
  pageId: string;
  role: ShareRole;
}
