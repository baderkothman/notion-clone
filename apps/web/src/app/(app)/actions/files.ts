"use server";

import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import { requestUpload, confirmUpload, getDownloadUrl, deleteFile } from "@/server/files/upload";
import type { RequestUploadInput, ConfirmUploadInput, DeleteFileInput } from "@notion-clone/contracts";

export async function requestUploadAction(input: RequestUploadInput) {
  const userId = await requireUserId();
  return runAction(() => requestUpload(userId, input));
}

export async function confirmUploadAction(input: ConfirmUploadInput) {
  const userId = await requireUserId();
  return runAction(() => confirmUpload(userId, input));
}

export async function getDownloadUrlAction(fileId: string) {
  const userId = await requireUserId();
  return runAction(() => getDownloadUrl(userId, fileId));
}

export async function deleteFileAction(input: DeleteFileInput) {
  const userId = await requireUserId();
  return runAction(() => deleteFile(userId, input));
}
