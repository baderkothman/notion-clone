"use client";

import type { EditorFileService } from "@notion-clone/editor";
import { requestUploadAction, confirmUploadAction, getDownloadUrlAction } from "@/app/(app)/actions/files";

export function createEditorFileService(workspaceId: string, pageId: string): EditorFileService {
  return {
    async upload(file) {
      const requested = await requestUploadAction({
        workspaceId,
        pageId,
        filename: file.name,
        // Cast is safe: requestUploadAction validates against the allowlist server-side
        // and rejects anything else — the client's declared type is never trusted alone.
        mimeType: file.type as never,
        sizeBytes: file.size,
      });
      if (!requested.ok) throw new Error(requested.error);

      const putResponse = await fetch(requested.value.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putResponse.ok) throw new Error("Upload failed.");

      const confirmed = await confirmUploadAction({ fileId: requested.value.fileId });
      if (!confirmed.ok) throw new Error(confirmed.error);

      return { fileId: requested.value.fileId, filename: file.name, mimeType: file.type, sizeBytes: file.size };
    },

    async getDownloadUrl(fileId) {
      const result = await getDownloadUrlAction(fileId);
      if (!result.ok) throw new Error(result.error);
      return result.value;
    },
  };
}
