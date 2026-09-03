"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, MoreHorizontal, Star, Trash2 } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notion-clone/ui";
import { Breadcrumbs } from "@/components/page/breadcrumbs";
import { PageIconPicker } from "@/components/page/page-icon-picker";
import { PageTitle } from "@/components/page/page-title";
import { updatePageIconAction, updatePageTitleAction, archivePageAction, duplicatePageAction, toggleFavoriteAction } from "@/app/(app)/actions/pages";

// Closed-by-default dialog (see the matching comment in page-view.tsx) — this was the
// other, easy-to-miss static importer of share-dialog.tsx that kept it merged into the
// route's main chunk even after page-view.tsx switched to a dynamic import.
const ShareDialog = dynamic(() => import("@/components/page/share-dialog").then((m) => m.ShareDialog));

export function DatabasePageHeader({
  workspaceSlug,
  page,
  breadcrumbTrail,
}: {
  workspaceSlug: string;
  page: {
    id: string;
    title: string;
    icon: string | null;
    visibility: "private" | "workspace";
    publicShareEnabled: boolean;
    publicShareToken: string | null;
  };
  breadcrumbTrail: { id: string; title: string; icon: string | null }[];
}) {
  const router = useRouter();
  const [icon, setIcon] = React.useState(page.icon);

  async function handleIconChange(next: string | null) {
    setIcon(next);
    const result = await updatePageIconAction({ pageId: page.id, icon: next });
    if (!result.ok) toast.error(result.error);
  }

  function handleTitleChange(title: string) {
    void updatePageTitleAction({ pageId: page.id, title });
  }

  async function handleFavorite() {
    const result = await toggleFavoriteAction({ pageId: page.id, favorite: true });
    if (!result.ok) return toast.error(result.error);
    toast.success("Added to Favorites");
  }

  async function handleDuplicate() {
    const result = await duplicatePageAction({ pageId: page.id });
    if (!result.ok) return toast.error(result.error);
    router.push(`/w/${workspaceSlug}/p/${result.value}`);
  }

  async function handleArchive() {
    const result = await archivePageAction({ pageId: page.id });
    if (!result.ok) return toast.error(result.error);
    toast.success("Moved to Trash");
    router.push(`/w/${workspaceSlug}`);
  }

  return (
    <div>
      <header className="flex h-11 shrink-0 items-center justify-between border-b border-border px-4">
        <Breadcrumbs workspaceSlug={workspaceSlug} trail={breadcrumbTrail} />
        <div className="flex items-center gap-3">
          <ShareDialog
            pageId={page.id}
            visibility={page.visibility}
            publicShareEnabled={page.publicShareEnabled}
            publicShareToken={page.publicShareToken}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Page menu">
                <MoreHorizontal className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleFavorite}>
                <Star className="size-3.5" /> Add to Favorites
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleDuplicate}>
                <Copy className="size-3.5" /> Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem destructive onSelect={handleArchive}>
                <Trash2 className="size-3.5" /> Move to Trash
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
      <div className="mx-auto max-w-full px-8 pt-6">
        <PageIconPicker icon={icon} onChange={handleIconChange} />
        <div className="mt-2">
          <PageTitle initialTitle={page.title} onChange={handleTitleChange} onEnter={() => {}} />
        </div>
      </div>
    </div>
  );
}
