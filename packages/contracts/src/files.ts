import { z } from "zod";

/** Extension allowlist enforced alongside MIME sniffing — never trust the client
 * Content-Type header alone. See docs/SECURITY.md "File and Image Handling". */
export const ALLOWED_UPLOAD_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/svg+xml",
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/zip",
] as const;

export const MAX_UPLOAD_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const requestUploadSchema = z.object({
  workspaceId: z.string().uuid(),
  pageId: z.string().uuid().optional(),
  filename: z.string().min(1).max(255),
  mimeType: z.enum(ALLOWED_UPLOAD_MIME_TYPES),
  sizeBytes: z.number().int().positive().max(MAX_UPLOAD_SIZE_BYTES),
});
export type RequestUploadInput = z.infer<typeof requestUploadSchema>;

export const confirmUploadSchema = z.object({ fileId: z.string().uuid() });
export type ConfirmUploadInput = z.infer<typeof confirmUploadSchema>;

export const deleteFileSchema = z.object({ fileId: z.string().uuid() });
export type DeleteFileInput = z.infer<typeof deleteFileSchema>;
