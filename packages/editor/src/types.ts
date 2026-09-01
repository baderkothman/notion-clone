import type { LinkMetadata } from "@notion-clone/contracts";

/** Implemented by the host app (apps/web) and passed into the editor via extension
 * options — the editor package itself has no knowledge of S3, presigned URLs, or server
 * actions. See apps/web/src/components/page/editor-file-service.ts for the real
 * implementation. */
export interface EditorFileService {
  upload(file: globalThis.File): Promise<{ fileId: string; filename: string; mimeType: string; sizeBytes: number }>;
  getDownloadUrl(fileId: string): Promise<string>;
}

export interface EditorEmbedService {
  fetchLinkMetadata(url: string): Promise<LinkMetadata>;
}

export type { LinkMetadata };
