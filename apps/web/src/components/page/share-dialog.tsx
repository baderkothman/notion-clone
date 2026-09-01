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
  const [isWorkspaceVisible, setIsWorkspaceVisible] = React.useState(visibility === "workspace");
  const [isPublic, setIsPublic] = React.useState(publicShareEnabled);
  const [publicToken, setPublicToken] = React.useState(publicShareToken);

  React.useEffect(() => {
    if (!open) return;
    void listSharesAction(pageId).then((result) => {
      if (result.ok) setShares(result.value);
    });
  }, [open, pageId]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const result = await sharePageAction({ pageId, email, role: "edit" });
    setLoading(false);
    if (!result.ok) return toast.error(result.error);
    setEmail("");
    const refreshed = await listSharesAction(pageId);
    if (refreshed.ok) setShares(refreshed.value);
    toast.success("Shared");
  }

  async function handleRevoke(userId: string) {
    const result = await revokeShareAction({ pageId, userId });
    if (!result.ok) return toast.error(result.error);
    setShares((prev) => prev.filter((s) => s.userId !== userId));
  }

  async function handleWorkspaceToggle(checked: boolean) {
    setIsWorkspaceVisible(checked);
    const result = await setPageVisibilityAction({ pageId, visibility: checked ? "workspace" : "private" });
    if (!result.ok) {
      setIsWorkspaceVisible(!checked);
      toast.error(result.error);
    }
  }

  async function handlePublicToggle(checked: boolean) {
    setIsPublic(checked);
    const result = await setPublicShareAction({ pageId, enabled: checked });
    if (!result.ok) {
      setIsPublic(!checked);
      toast.error(result.error);
      return;
    }
    setPublicToken(result.value.publicShareToken);
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
                  <X className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}

        <div className="mt-4 space-y-3 border-t border-border pt-3">
          <label className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-text">
              <Globe className="h-3.5 w-3.5 text-text-faint" /> Visible to workspace
            </span>
            <input
              type="checkbox"
              checked={isWorkspaceVisible}
              onChange={(e) => handleWorkspaceToggle(e.target.checked)}
              className="h-4 w-4"
            />
          </label>
          <label className="flex items-center justify-between text-sm">
            <span className="flex items-center gap-2 text-text">
              <Link2 className="h-3.5 w-3.5 text-text-faint" /> Share to web
            </span>
            <input
              type="checkbox"
              checked={isPublic}
              onChange={(e) => handlePublicToggle(e.target.checked)}
              className="h-4 w-4"
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
