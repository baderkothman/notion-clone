"use client";

import * as React from "react";
import { toast } from "sonner";
import { updatePageIconAction, updatePageCoverAction } from "@/app/(app)/actions/pages";

/** Owns the page's icon/cover local-editable state and their save actions — extracted
 * out of `page-view.tsx` as a small, self-contained concern (matches `useComments`'
 * reasoning). Both are optimistic: the local state updates immediately, and only rolls
 * back implicitly via a toast on failure (matching the pre-extraction behavior exactly
 * — neither ever reverted the optimistic value on error before, so this doesn't either). */
export function usePageChrome(pageId: string, initialIcon: string | null, initialCover: string | null) {
  const [icon, setIcon] = React.useState(initialIcon);
  const [cover, setCover] = React.useState(initialCover);

  async function changeIcon(next: string | null) {
    setIcon(next);
    const result = await updatePageIconAction({ pageId, icon: next });
    if (!result.ok) toast.error(result.error);
  }

  async function changeCover(next: string | null) {
    setCover(next);
    const result = await updatePageCoverAction({ pageId, coverImage: next });
    if (!result.ok) toast.error(result.error);
  }

  return { icon, cover, changeIcon, changeCover };
}
