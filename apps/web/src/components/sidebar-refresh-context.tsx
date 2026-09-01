"use client";

import * as React from "react";

/**
 * Signals the sidebar's page tree to re-fetch its root list. The tree keeps its own
 * client state (for lazy-loaded children, drag-and-drop, etc.), so creating a page from
 * anywhere else in the app — the workspace empty-state button, the editor's "Page" slash
 * command, the sidebar's own "New" menu — needs a way to tell it "something changed"
 * without threading a callback prop through every one of those call sites individually.
 */
const SidebarRefreshContext = React.createContext<(() => void) | null>(null);

export function SidebarRefreshProvider({
  onRefresh,
  children,
}: {
  onRefresh: () => void;
  children: React.ReactNode;
}) {
  return <SidebarRefreshContext.Provider value={onRefresh}>{children}</SidebarRefreshContext.Provider>;
}

/** Call the returned function after creating/moving/archiving a top-level page from
 * outside the sidebar itself. A no-op outside the provider (e.g. in isolated tests)
 * rather than throwing. */
export function useSidebarRefresh(): () => void {
  const notify = React.useContext(SidebarRefreshContext);
  return notify ?? (() => {});
}
