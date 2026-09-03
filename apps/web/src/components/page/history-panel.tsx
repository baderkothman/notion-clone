"use client";

import * as React from "react";
import { toast } from "sonner";
import { Dialog, DialogContent, Button } from "@notion-clone/ui";
import { listRevisionsAction, restoreRevisionAction } from "@/app/(app)/actions/history";

interface Revision {
  id: string;
  title: string;
  createdAt: Date;
  createdByName: string | null;
  createdByEmail: string | null;
}

export function HistoryPanel({
  pageId,
  open,
  onOpenChange,
  onRestored,
}: {
  pageId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRestored: () => void;
}) {
  const [revisions, setRevisions] = React.useState<Revision[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setLoading(true);
    void listRevisionsAction(pageId).then((result) => {
      setLoading(false);
      if (result.ok) setRevisions(result.value);
    });
  }, [open, pageId]);

  async function handleRestore(revisionId: string) {
    const result = await restoreRevisionAction(pageId, revisionId);
    if (!result.ok) return toast.error(result.error);
    toast.success("Page restored to this version");
    onOpenChange(false);
    onRestored();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Page history" description="Snapshots taken automatically while editing.">
        {loading ? (
          <p className="text-sm text-text-faint">Loading…</p>
        ) : revisions.length === 0 ? (
          <p className="text-sm text-text-faint">No snapshots yet. One is captured automatically as you keep editing.</p>
        ) : (
          <ul className="max-h-96 space-y-1 overflow-y-auto">
            {revisions.map((revision) => (
              <li key={revision.id} className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 hover:bg-hover">
                <div className="min-w-0">
                  <p className="truncate text-sm text-text">{revision.title || "Untitled"}</p>
                  <p className="text-xs text-text-faint">
                    {new Date(revision.createdAt).toLocaleString()}
                    {revision.createdByName ? ` · ${revision.createdByName}` : ""}
                  </p>
                </div>
                <Button size="sm" variant="secondary" onClick={() => handleRestore(revision.id)}>
                  Restore
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
