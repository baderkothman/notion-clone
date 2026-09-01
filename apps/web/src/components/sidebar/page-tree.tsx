"use client";

import * as React from "react";
import type { PageTreeNode } from "@notion-clone/contracts";
import { listChildPagesAction } from "@/app/(app)/actions/pages";
import { PageTreeItem } from "./page-tree-item";
import { Skeleton } from "@notion-clone/ui";

export function PageTree({
  workspaceId,
  workspaceSlug,
  initialItems,
}: {
  workspaceId: string;
  workspaceSlug: string;
  initialItems: PageTreeNode[];
}) {
  const [items, setItems] = React.useState(initialItems);
  const [refreshing, setRefreshing] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setRefreshing(true);
    const result = await listChildPagesAction(workspaceId, null);
    if (result.ok) setItems(result.value);
    setRefreshing(false);
  }, [workspaceId]);

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

export function PageTreeSkeleton() {
  return (
    <div className="space-y-1 px-2">
      <Skeleton className="h-6 w-full" />
      <Skeleton className="h-6 w-5/6" />
      <Skeleton className="h-6 w-2/3" />
    </div>
  );
}
