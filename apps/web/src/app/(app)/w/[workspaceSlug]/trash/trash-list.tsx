"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { File, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@notion-clone/ui";
import { restorePageAction, deletePagePermanentlyAction } from "../../../actions/pages";

interface TrashedPage {
  id: string;
  title: string;
  icon: string | null;
  archivedAt: Date | null;
}

export function TrashList({ workspaceSlug, pages }: { workspaceSlug: string; pages: TrashedPage[] }) {
  const [items, setItems] = React.useState(pages);
  const router = useRouter();

  async function handleRestore(pageId: string) {
    const result = await restorePageAction({ pageId });
    if (!result.ok) return toast.error(result.error);
    setItems((prev) => prev.filter((p) => p.id !== pageId));
    toast.success("Page restored", {
      action: { label: "Open", onClick: () => router.push(`/w/${workspaceSlug}/p/${pageId}`) },
    });
    router.refresh();
  }

  async function handleDeleteForever(pageId: string) {
    if (!confirm("Permanently delete this page? This cannot be undone.")) return;
    const result = await deletePagePermanentlyAction({ pageId });
    if (!result.ok) return toast.error(result.error);
    setItems((prev) => prev.filter((p) => p.id !== pageId));
    toast.success("Page permanently deleted");
  }

  return (
    <ul className="divide-y divide-border rounded-lg border border-border">
      {items.map((page) => (
        <li key={page.id} className="flex items-center gap-3 px-4 py-3">
          <span className="text-text-faint">{page.icon ?? <File className="size-4" />}</span>
          <span className="flex-1 truncate text-sm text-text">{page.title || "Untitled"}</span>
          <Button size="sm" variant="secondary" onClick={() => handleRestore(page.id)}>
            <RotateCcw className="size-3.5" /> Restore
          </Button>
          <Button size="sm" variant="destructive" onClick={() => handleDeleteForever(page.id)}>
            <Trash2 className="size-3.5" /> Delete forever
          </Button>
        </li>
      ))}
    </ul>
  );
}
