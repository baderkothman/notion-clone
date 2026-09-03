"use client";

import * as React from "react";
import { toast } from "sonner";
import { Globe, Link2, X } from "lucide-react";
import { Dialog, DialogContent, DialogTrigger, Button, Input, Avatar } from "@notion-clone/ui";
import {
  sharePageAction,
  listSharesAction,
  revokeShareAction,
  setPageVisibilityAction,
  setPublicShareAction,
} from "@/app/(app)/actions/sharing";
import type { ShareRole } from "@notion-clone/contracts";

interface ShareRow {
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: ShareRole;
}

export function ShareDialog({
  pageId,
  visibility,
  publicShareEnabled,
  publicShareToken,
}: {
  pageId: string;
  visibility: "private" | "workspace";
  publicShareEnabled: boolean;
  publicShareToken: string | null;
}) {
  const [open, setOpen] = React.useState(false);
  const [shares, setShares] = React.useState<ShareRow[]>([]);
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [workspaceVisibilityOverride, setWorkspaceVisibilityOverride] = React.useState<{
    pageId: string;
    visible: boolean;
  } | null>(null);
  const [publicOverride, setPublicOverride] = React.useState<{
    pageId: string;
    enabled: boolean;
    token: string | null;
  } | null>(null);
  const isWorkspaceVisible =
    workspaceVisibilityOverride?.pageId === pageId
      ? workspaceVisibilityOverride.visible
      : visibility === "workspace";
  const isPublic = publicOverride?.pageId === pageId ? publicOverride.enabled : publicShareEnabled;
  const publicToken = publicOverride?.pageId === pageId ? publicOverride.token : publicShareToken;

  // A monotonic id, not just a boolean, so that if two refreshes overlap (the
  // open-triggered effect below and handleInvite's own refresh after a successful
  // share), an older response landing after a newer one has already started can never
  // clobber the newer, more current `shares` state with stale data.
  const shareRequestIdRef = React.useRef(0);
  const refreshShares = React.useCallback(async () => {
    const requestId = ++shareRequestIdRef.current;
    const result = await listSharesAction(pageId);
    if (requestId !== shareRequestIdRef.current) return;
    if (result.ok) setShares(result.value);
  }, [pageId]);

  React.useEffect(() => {
    if (!open) return;
    void refreshShares();
  }, [open, refreshShares]);

  // Same monotonic-id guard as refreshShares above: the Invite button is disabled while
  // `loading` is true, so under normal use a second submit can't start before this one's
  // `finally` runs — but guarding it anyway keeps this handler from ever clearing a
  // newer invite's loading state out from under it, matching this file's own pattern
  // rather than relying solely on the disabled attribute for correctness.
  const inviteRequestIdRef = React.useRef(0);
  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    const requestId = ++inviteRequestIdRef.current;
    setLoading(true);
    try {
      const result = await sharePageAction({ pageId, email, role: "edit" });
      if (!result.ok) return toast.error(result.error);
      setEmail("");
      await refreshShares();
      toast.success("Shared");
    } finally {
      if (requestId === inviteRequestIdRef.current) setLoading(false);
    }
  }

  async function handleRevoke(userId: string) {
    const result = await revokeShareAction({ pageId, userId });
    if (!result.ok) return toast.error(result.error);
    setShares((prev) => prev.filter((s) => s.userId !== userId));
  }

  const workspaceVisibilityRequestIdRef = React.useRef(0);
  async function handleWorkspaceToggle(checked: boolean) {
    const requestId = ++workspaceVisibilityRequestIdRef.current;
    setWorkspaceVisibilityOverride({ pageId, visible: checked });
    const result = await setPageVisibilityAction({ pageId, visibility: checked ? "workspace" : "private" });
    if (requestId !== workspaceVisibilityRequestIdRef.current) return;
    if (!result.ok) {
      setWorkspaceVisibilityOverride(null);
      toast.error(result.error);
    }
  }

  const publicShareRequestIdRef = React.useRef(0);
  async function handlePublicToggle(checked: boolean) {
    const requestId = ++publicShareRequestIdRef.current;
    setPublicOverride({ pageId, enabled: checked, token: publicToken });
    const result = await setPublicShareAction({ pageId, enabled: checked });
    if (requestId !== publicShareRequestIdRef.current) return;
    if (!result.ok) {
      setPublicOverride(null);
      toast.error(result.error);
      return;
    }
    setPublicOverride({ pageId, enabled: checked, token: result.value.publicShareToken });
  }

  function copyPublicLink() {
    if (!publicToken) return;
    void navigator.clipboard.writeText(`${window.location.origin}/share/${publicToken}`);
    toast.success("Link copied");
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="secondary">
          Share
        </Button>
      </DialogTrigger>
      <DialogContent title="Share this page" description="Control who can view and edit.">
        <form onSubmit={handleInvite} className="flex items-center gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Invite by email…"
            required
          />
          <Button type="submit" disabled={loading} size="sm">
            Invite
          </Button>
        </form>

        {shares.length > 0 ? (
          <ul className="mt-3 space-y-2">
            {shares.map((share) => (
              <li key={share.userId} className="flex items-center gap-2 text-sm">
                <Avatar name={share.name ?? share.email} src={share.image} size={22} />
                <span className="min-w-0 flex-1 truncate">{share.name ?? share.email}</span>
                <span className="text-xs text-text-faint capitalize">{share.role}</span>
                <button
                  onClick={() => handleRevoke(share.userId)}
                  aria-label={`Remove ${share.email}`}
                  className="rounded p-1 text-text-faint hover:bg-hover hover:text-destructive"
                >
                  <X className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <label className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-text">
              <Globe className="size-3.5 text-text-faint" /> Visible to workspace
            </span>
            <input
              type="checkbox"
              checked={isWorkspaceVisible}
              onChange={(e) => handleWorkspaceToggle(e.target.checked)}
              className="size-4"
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-text">
              <Link2 className="size-3.5 text-text-faint" /> Share to web
            </span>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => handlePublicToggle(e.target.checked)}
              className="size-4"
            />
          </label>
          {isPublic && publicToken ? (
            <button onClick={copyPublicLink} className="text-xs text-accent hover:underline">
              Copy public link
            </button>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
