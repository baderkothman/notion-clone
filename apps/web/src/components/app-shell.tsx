"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { cn } from "@notion-clone/ui";
import { Sidebar } from "@/components/sidebar/sidebar";
import type { WorkspaceSummary } from "@/components/sidebar/workspace-switcher";
import type { PageTreeNode } from "@notion-clone/contracts";
import type { FavoriteItem } from "@/components/sidebar/favorites-list";

/**
 * Below `md`, the sidebar becomes an off-canvas drawer (not a shrunk copy of the desktop
 * layout) opened by a top-bar hamburger button, per "the mobile experience does not need
 * to simply compress the desktop UI". At `md` and above it's a permanent column.
 */
export function AppShell({
  currentWorkspace,
  workspaces,
  rootPages,
  favorites,
  user,
  children,
}: {
  currentWorkspace: WorkspaceSummary;
  workspaces: WorkspaceSummary[];
  rootPages: PageTreeNode[];
  favorites: FavoriteItem[];
  user: { name: string | null; email: string; image: string | null };
  children: React.ReactNode;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Desktop sidebar */}
      <div className="hidden md:block">
        <Sidebar currentWorkspace={currentWorkspace} workspaces={workspaces} rootPages={rootPages} favorites={favorites} user={user} />
      </div>

      {/* Mobile drawer */}
      <div
        className={cn(
          "fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden",
          mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
        )}
        onClick={() => setMobileOpen(false)}
        aria-hidden={!mobileOpen}
      />
      <div
        className={cn(
          "fixed inset-y-0 left-0 z-50 transition-transform md:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <Sidebar currentWorkspace={currentWorkspace} workspaces={workspaces} rootPages={rootPages} favorites={favorites} user={user} />
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center border-b border-border px-2 md:hidden">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
            className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-hover"
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <span className="ml-2 truncate text-sm font-medium text-text">{currentWorkspace.name}</span>
        </div>
        <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}
