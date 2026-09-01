"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Database, FileText, Plus, Trash2 } from "lucide-react";
import { cn, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@notion-clone/ui";
import type { PageTreeNode } from "@notion-clone/contracts";
import { WorkspaceSwitcher, type WorkspaceSummary } from "./workspace-switcher";
import { PageTree } from "./page-tree";
import { FavoritesList, type FavoriteItem } from "./favorites-list";
import { SidebarFooter } from "./sidebar-footer";
import { CommandMenu } from "@/components/search/command-menu";
import { createPageAction } from "@/app/(app)/actions/pages";
import { createDatabaseAction } from "@/app/(app)/actions/databases";

export function Sidebar({
  currentWorkspace,
  workspaces,
  rootPages,
  favorites,
  user,
  treeRefreshKey,
  onPageCreated,
}: {
  currentWorkspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  rootPages: PageTreeNode[];
  favorites: FavoriteItem[];
  user: { name: string | null; email: string; image: string | null };
  treeRefreshKey: number;
  onPageCreated: () => void;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isTrashActive = pathname === `/w/${currentWorkspace.slug}/trash`;

  async function handleNewPage() {
    const result = await createPageAction({ workspaceId: currentWorkspace.id });
    if (!result.ok) return toast.error(result.error);
    onPageCreated();
    router.push(`/w/${currentWorkspace.slug}/p/${result.value.id}`);
  }

  async function handleNewDatabase() {
    const result = await createDatabaseAction({ workspaceId: currentWorkspace.id });
    if (!result.ok) return toast.error(result.error);
    onPageCreated();
    router.push(`/w/${currentWorkspace.slug}/p/${result.value.id}`);
  }

  return (
    <nav
      aria-label="Sidebar"
      className="flex h-screen w-64 shrink-0 flex-col border-r border-border bg-sidebar"
    >
      <div className="flex flex-col gap-2 p-2">
        <WorkspaceSwitcher current={currentWorkspace} workspaces={workspaces} />
        <CommandMenu workspaceId={currentWorkspace.id} workspaceSlug={currentWorkspace.slug} />
      </div>

      <div className="flex-1 overflow-y-auto px-2 pb-2">
        <FavoritesList items={favorites} workspaceSlug={currentWorkspace.slug} />

        <div className="flex items-center justify-between px-2 pb-1">
          <p className="text-xs font-medium text-text-faint">Pages</p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label="New" className="flex h-5 w-5 items-center justify-center rounded hover:bg-hover">
                <Plus className="h-3.5 w-3.5 text-text-faint" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={handleNewPage}>
                <FileText className="h-3.5 w-3.5" /> Page
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={handleNewDatabase}>
                <Database className="h-3.5 w-3.5" /> Database
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <PageTree
          workspaceId={currentWorkspace.id}
          workspaceSlug={currentWorkspace.slug}
          initialItems={rootPages}
          refreshKey={treeRefreshKey}
        />

        <Link
          href={`/w/${currentWorkspace.slug}/trash`}
          className={cn(
            "mt-3 flex items-center gap-1.5 rounded-md px-2 py-1 text-sm",
            isTrashActive ? "bg-selected text-text" : "text-text-muted hover:bg-hover hover:text-text",
          )}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Trash
        </Link>
      </div>

      <SidebarFooter user={user} workspaceSlug={currentWorkspace.slug} />
    </nav>
  );
}
