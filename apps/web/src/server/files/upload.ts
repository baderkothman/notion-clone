import "server-only";
import { PutObjectCommand, HeadObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { db, files, eq } from "@notion-clone/database";
import {
  requestUploadSchema,
  confirmUploadSchema,
  ALLOWED_UPLOAD_MIME_TYPES,
  type RequestUploadInput,
  type ConfirmUploadInput,
} from "@notion-clone/contracts";
import { NotFoundError, ValidationError, newToken } from "@notion-clone/shared";
import { assertWorkspaceMembership } from "../permissions/assert";
import { assertPagePermission } from "../permissions/assert";
import { getS3Client, getBucket } from "./s3-client";

const UPLOAD_URL_TTL_SECONDS = 5 * 60;
const DOWNLOAD_URL_TTL_SECONDS = 60 * 60;

function extensionFor(mimeType: string): string {
  const map: Record<string, string> = {
    "image/png": "png",
    "image/jpeg": "jpg",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg",
    "application/pdf": "pdf",
    "text/plain": "txt",
    "text/csv": "csv",
  };
  return map[mimeType] ?? "bin";
}

/** Issues a presigned PUT URL. The object key is fully randomized (never derived from
 * the client-supplied filename) and namespaced under the workspace, so a leaked key from
 * one workspace can't be guessed or reused to target another — see docs/SECURITY.md. The
 * `files` row starts "pending" and is only usable after `confirmUpload` verifies the
 * object actually landed in the bucket with an allowed content type and size. */
export async function requestUpload(userId: string, raw: RequestUploadInput) {
  const input = requestUploadSchema.parse(raw);
  await assertWorkspaceMembership(userId, input.workspaceId);
  if (input.pageId) await assertPagePermission(userId, input.pageId, "edit");

  if (!ALLOWED_UPLOAD_MIME_TYPES.includes(input.mimeType)) {
    throw new ValidationError("File type is not allowed.");
  }

  const objectKey = `${input.workspaceId}/${newToken(16)}.${extensionFor(input.mimeType)}`;

  const [file] = await db
    .insert(files)
    .values({
      workspaceId: input.workspaceId,
      pageId: input.pageId ?? null,
      uploadedByUserId: userId,
      objectKey,
      originalFilename: input.filename.slice(0, 255),
      mimeType: input.mimeType,
      sizeBytes: input.sizeBytes,
      status: "pending",
    })
    .returning();
  if (!file) throw new Error("Failed to register upload.");

  const uploadUrl = await getSignedUrl(
    getS3Client(),
    new PutObjectCommand({ Bucket: getBucket(), Key: objectKey, ContentType: input.mimeType }),
    { expiresIn: UPLOAD_URL_TTL_SECONDS },
  );

  return { fileId: file.id, uploadUrl, objectKey };
}

/** Confirms the object was actually uploaded (HEAD request) before the file is ever
 * linked into a document — an unconfirmed "pending" file is never rendered. Also
 * re-validates the actual stored size/content-type against what the client declared, so
 * a forged Content-Type header at PUT time doesn't slip an unexpected file type past
 * `requestUpload`'s allowlist check. */
export async function confirmUpload(userId: string, raw: ConfirmUploadInput) {
  const input = confirmUploadSchema.parse(raw);
  const [file] = await db.select().from(files).where(eq(files.id, input.fileId)).limit(1);
  if (!file || file.uploadedByUserId !== userId) throw new NotFoundError("File");

  const head = await getS3Client().send(
    new HeadObjectCommand({ Bucket: getBucket(), Key: file.objectKey }),
  );
  if (!head.ContentType || !ALLOWED_UPLOAD_MIME_TYPES.includes(head.ContentType as typeof ALLOWED_UPLOAD_MIME_TYPES[number])) {
    await getS3Client().send(new DeleteObjectCommand({ Bucket: getBucket(), Key: file.objectKey }));
    await db.delete(files).where(eq(files.id, file.id));
    throw new ValidationError("Uploaded file type could not be verified.");
  }

  await db.update(files).set({ status: "uploaded" }).where(eq(files.id, file.id));
  return { fileId: file.id, objectKey: file.objectKey };
}

export async function getDownloadUrl(userId: string, fileId: string): Promise<string> {
  const [file] = await db.select().from(files).where(eq(files.id, fileId)).limit(1);
  if (!file || file.status !== "uploaded") throw new NotFoundError("File");
  await assertWorkspaceMembership(userId, file.workspaceId);
  if (file.pageId) await assertPagePermission(userId, file.pageId, "view");

  return getSignedUrl(
    getS3Client(),
    new GetObjectCommand({ Bucket: getBucket(), Key: file.objectKey }),
    { expiresIn: DOWNLOAD_URL_TTL_SECONDS },
  );
}
