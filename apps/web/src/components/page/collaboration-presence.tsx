import { Avatar } from "@notion-clone/ui";
import type { CollaborationStatus, CollaborationUser } from "@notion-clone/editor";

/** Shown in the page header only while realtime editing is actually active for this
 * session (see page-view.tsx) — a "Live"/"Reconnecting…" label plus an avatar stack for
 * whoever else is currently in the room. Cursors/selections themselves are rendered
 * inline in the editor by the CollaborationCursor extension (kit.ts); this is just the
 * at-a-glance summary, the realtime equivalent of AutosaveIndicator. */
export function CollaborationPresence({ status, users }: { status: CollaborationStatus; users: CollaborationUser[] }) {
  if (status === "disabled") return null;

  return (
    <div className="flex items-center gap-2">
      <span className={`flex items-center gap-1.5 text-xs ${status === "connected" ? "text-text-faint" : "text-text-muted"}`}>
        <span
          className={`h-1.5 w-1.5 rounded-full ${status === "connected" ? "bg-success" : "bg-text-faint"}`}
          aria-hidden="true"
        />
        {status === "connected" ? "Live" : status === "connecting" ? "Connecting…" : "Reconnecting…"}
      </span>
      {users.length > 0 ? (
        // Per-avatar negative margin (not `-space-x-*` on the container) for the
        // overlap: `space-x`/`gap` are both incapable of negative values (`gap` can't
        // go negative at all; `-space-x` also leaves an uneven gap if a child in the
        // middle of the row is ever conditionally hidden, since it's a sibling-margin
        // trick, not real spacing). Skipping the first avatar keeps its left edge flush.
        <div className="flex items-center">
          {users.slice(0, 5).map((user, index) => (
            <Avatar
              key={user.name}
              name={user.name}
              size={20}
              className={`ring-2 ring-surface ${index > 0 ? "-ml-1.5" : ""}`}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}
