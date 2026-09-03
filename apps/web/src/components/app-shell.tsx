"use client";

import * as React from "react";
import { Menu, X } from "lucide-react";
import { LazyMotion, domAnimation } from "motion/react";
import { cn } from "@notion-clone/ui";
import { Sidebar } from "@/components/sidebar/sidebar";
import type { WorkspaceSummary } from "@/components/sidebar/workspace-switcher";
import type { PageTreeNode } from "@notion-clone/contracts";
import type { FavoriteItem } from "@/components/sidebar/favorites-list";
import { SidebarRefreshProvider } from "@/components/sidebar-refresh-context";

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
  const hamburgerRef = React.useRef<HTMLButtonElement>(null);
  // Bumped whenever a top-level page is created/moved/archived from anywhere in the
  // app (the sidebar's own "New" menu, the workspace empty-state button, the editor's
  // "Page" slash command) so both sidebar instances re-fetch their root list — see
  // sidebar-refresh-context.tsx for why a prop alone doesn't do this.
  const [treeRefreshKey, setTreeRefreshKey] = React.useState(0);
  const notify = React.useCallback(() => setTreeRefreshKey((k) => k + 1), []);

  function closeMobileDrawer() {
    setMobileOpen(false);
    // Focus was inside the drawer (or the hamburger itself) while it was open; send it
    // back to the trigger that opened it rather than letting it fall back to <body>,
    // which would silently strand keyboard users with no visible focus indicator.
    hamburgerRef.current?.focus();
  }

  // Escape closes the drawer from anywhere inside it — the standard keyboard path for
  // dismissing an off-canvas/dialog-like surface, matching what the Radix-based
  // dialogs/popovers elsewhere in the app already do for free.
  React.useEffect(() => {
    if (!mobileOpen) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") closeMobileDrawer();
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mobileOpen]);

  return (
    // Every `motion`-animated component under the authenticated app shell (the sidebar's
    // drag lift, the comments panel's open/close) uses the small `m.*` components from
    // "motion/react-m" instead of the full `motion.*` ones, reading the animation engine
    // from this one provider — see motion's "reduce bundle size" guidance. `domAnimation`
    // (not the larger `domMax`) is enough since nothing here uses motion's own
    // drag/pan/layout-projection system (the sidebar's drag-and-drop is native HTML5,
    // not motion's `drag` prop). Scoped to the app shell, not the root layout: the public
    // share/database routes render outside `AppShell` entirely and currently use no
    // motion at all, so they carry none of this weight either way.
    <LazyMotion features={domAnimation}>
      <SidebarRefreshProvider onRefresh={notify}>
        <div className="flex h-dvh overflow-hidden bg-bg">
          {/* Desktop sidebar */}
          <div className="hidden md:block">
            <Sidebar
              currentWorkspace={currentWorkspace}
              workspaces={workspaces}
              rootPages={rootPages}
              favorites={favorites}
              user={user}
              treeRefreshKey={treeRefreshKey}
              onPageCreated={notify}
            />
          </div>

          {/* Mobile drawer backdrop — a real `<button>`, not a `<div onClick>`: a plain
            div has no keyboard/screen-reader affordance at all (can't be Tabbed to,
            Enter/Space do nothing), so keyboard users had no way to dismiss the drawer
            except Escape (added below). */}
          <button
            type="button"
            className={cn(
              "fixed inset-0 z-40 cursor-default bg-black/40 transition-opacity md:hidden",
              mobileOpen ? "opacity-100" : "pointer-events-none opacity-0",
            )}
            onClick={closeMobileDrawer}
            aria-label="Dismiss sidebar overlay"
            tabIndex={mobileOpen ? 0 : -1}
            aria-hidden={!mobileOpen}
          />
          <div
            className={cn(
              "fixed inset-y-0 left-0 z-50 transition-transform md:hidden",
              mobileOpen ? "translate-x-0" : "-translate-x-full",
            )}
          >
            <Sidebar
              currentWorkspace={currentWorkspace}
              workspaces={workspaces}
              rootPages={rootPages}
              favorites={favorites}
              user={user}
              treeRefreshKey={treeRefreshKey}
              onPageCreated={notify}
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex h-11 shrink-0 items-center border-b border-border px-2 md:hidden">
              <button
                ref={hamburgerRef}
                onClick={() => (mobileOpen ? closeMobileDrawer() : setMobileOpen(true))}
                aria-label={mobileOpen ? "Close sidebar" : "Open sidebar"}
                className="flex size-8 items-center justify-center rounded-md hover:bg-hover"
              >
                {mobileOpen ? <X className="size-4" /> : <Menu className="size-4" />}
              </button>
              <span className="ml-2 truncate text-sm font-medium text-text">{currentWorkspace.name}</span>
            </div>
            <div className="min-w-0 flex-1 overflow-y-auto">{children}</div>
          </div>
        </div>
      </SidebarRefreshProvider>
    </LazyMotion>
  );
}
