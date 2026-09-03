"use client";

import * as React from "react";
import type { PageTreeNode } from "@notion-clone/contracts";
import { listChildPagesAction } from "@/app/(app)/actions/pages";
import { PageTreeItem } from "./page-tree-item";

export function PageTree({
  workspaceId,
  workspaceSlug,
  initialItems,
  refreshKey,
}: {
  workspaceId: string;
  workspaceSlug: string;
  initialItems: PageTreeNode[];
  /** Bump this (e.g. a counter) from the parent to force a re-fetch of the root list —
   * used after creating a new top-level page/database. The tree otherwise owns its own
   * state (for lazy-loaded nested children, drag-and-drop, etc.), so a prop change to
   * `initialItems` alone wouldn't be picked up: `useState`'s initial value is only read
   * once, on mount. */
  refreshKey?: number;
}) {
  const [items, setItems] = React.useState(initialItems);
  const [refreshing, setRefreshing] = React.useState(false);
  const mounted = React.useRef(false);

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    try {
      const result = await listChildPagesAction(workspaceId, null);
      if (result.ok) setItems(result.value);
    } finally {
      setRefreshing(false);
    }
  }, [workspaceId]);

  React.useEffect(() => {
    if (!mounted.current) {
      mounted.current = true;
      return;
    }
    void refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  if (items.length === 0) {
    return <p className="px-2 py-1.5 text-xs text-text-faint">No pages yet</p>;
  }

  return (
    <div aria-busy={refreshing}>
      {items.map((item) => (
        <PageTreeItem
          key={item.id}
          node={item}
          workspaceId={workspaceId}
          workspaceSlug={workspaceSlug}
          depth={0}
          onArchived={refresh}
        />
      ))}
    </div>
  );
}
