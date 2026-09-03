"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Copy, History, MessageSquare, MoreHorizontal, Star, Trash2 } from "lucide-react";
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@notion-clone/ui";
import { archivePageAction, duplicatePageAction, toggleFavoriteAction } from "@/app/(app)/actions/pages";

export function PageMenu({
  pageId,
  workspaceSlug,
  onOpenHistory,
  onToggleComments,
}: {
  pageId: string;
  workspaceSlug: string;
  onOpenHistory: () => void;
  onToggleComments: () => void;
}) {
  const router = useRouter();

  async function handleFavorite() {
    const result = await toggleFavoriteAction({ pageId, favorite: true });
    if (!result.ok) return toast.error(result.error);
    toast.success("Added to Favorites");
  }

  async function handleDuplicate() {
    const result = await duplicatePageAction({ pageId });
    if (!result.ok) return toast.error(result.error);
    router.push(`/w/${workspaceSlug}/p/${result.value}`);
  }

  async function handleArchive() {
    const result = await archivePageAction({ pageId });
    if (!result.ok) return toast.error(result.error);
    toast.success("Moved to Trash");
    router.push(`/w/${workspaceSlug}`);
  }

  return (
    <div className="flex items-center gap-1">
      <Button size="icon" variant="ghost" onClick={onToggleComments} aria-label="Comments">
        <MessageSquare className="size-3.5" />
      </Button>
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
          <DropdownMenuItem onSelect={onOpenHistory}>
            <History className="size-3.5" /> Page history
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem destructive onSelect={handleArchive}>
            <Trash2 className="size-3.5" /> Move to Trash
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
