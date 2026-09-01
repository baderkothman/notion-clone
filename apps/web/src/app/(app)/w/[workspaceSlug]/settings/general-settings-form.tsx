"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, Input, Label } from "@notion-clone/ui";
import { PageIconPicker } from "@/components/page/page-icon-picker";
import { updateWorkspaceAction } from "@/app/(app)/actions/workspaces";

export function GeneralSettingsForm({
  workspaceId,
  name: initialName,
  icon: initialIcon,
  slug: initialSlug,
  editable,
}: {
  workspaceId: string;
  name: string;
  icon: string | null;
  slug: string;
  editable: boolean;
}) {
  const router = useRouter();
  const [name, setName] = React.useState(initialName);
  const [icon, setIcon] = React.useState(initialIcon);
  const [slug, setSlug] = React.useState(initialSlug);
  const [saving, setSaving] = React.useState(false);

  async function handleIconChange(next: string | null) {
    setIcon(next);
    const result = await updateWorkspaceAction({ workspaceId, icon: next });
    if (!result.ok) toast.error(result.error);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    const slugChanged = slug !== initialSlug;
    const result = await updateWorkspaceAction({
      workspaceId,
      name: name.trim() || undefined,
      slug: slugChanged ? slug.trim() : undefined,
    });
    setSaving(false);
    if (!result.ok) return toast.error(result.error);
    toast.success("Workspace updated");
    if (slugChanged) router.push(`/w/${result.value.slug}/settings`);
  }

  return (
    <form onSubmit={handleSave} className="max-w-sm space-y-4">
      <div>
        <Label>Icon</Label>
        <div className="mt-1">
          <PageIconPicker icon={icon} onChange={handleIconChange} size="sm" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="workspace-name">Name</Label>
        <Input id="workspace-name" value={name} onChange={(e) => setName(e.target.value)} disabled={!editable} required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="workspace-slug">URL</Label>
        <div className="flex items-center gap-1 text-sm text-text-faint">
          <span className="shrink-0">/w/</span>
          <Input
            id="workspace-slug"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
            disabled={!editable}
            required
          />
        </div>
      </div>
      {editable ? (
        <Button type="submit" variant="primary" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      ) : (
        <p className="text-xs text-text-faint">Only workspace owners and admins can change these settings.</p>
      )}
    </form>
  );
}
