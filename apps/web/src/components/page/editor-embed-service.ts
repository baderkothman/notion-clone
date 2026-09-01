"use client";

import type { EditorEmbedService } from "@notion-clone/editor";
import { fetchLinkMetadataAction } from "@/app/(app)/actions/embeds";

export const editorEmbedService: EditorEmbedService = {
  async fetchLinkMetadata(url) {
    const result = await fetchLinkMetadataAction({ url });
    if (!result.ok) throw new Error(result.error);
    return result.value;
  },
};
