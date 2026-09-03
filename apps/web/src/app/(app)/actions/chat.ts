"use server";

import { requireUserId } from "@/server/session";
import { runAction } from "@/server/action-result";
import { listChannels, ensureDefaultChannel, createChannel } from "@/server/chat/channels";
import { listMessages, sendMessage, editMessage, deleteMessage } from "@/server/chat/messages";
import type {
  CreateChannelInput,
  SendMessageInput,
  EditMessageInput,
  DeleteMessageInput,
  ListMessagesInput,
} from "@notion-clone/contracts";

export async function listChannelsAction(workspaceId: string) {
  const userId = await requireUserId();
  return runAction(() => listChannels(userId, workspaceId));
}

export async function ensureDefaultChannelAction(workspaceId: string) {
  const userId = await requireUserId();
  return runAction(() => ensureDefaultChannel(userId, workspaceId));
}

export async function createChannelAction(input: CreateChannelInput) {
  const userId = await requireUserId();
  return runAction(() => createChannel(userId, input));
}

export async function listMessagesAction(input: ListMessagesInput) {
  const userId = await requireUserId();
  return runAction(() => listMessages(userId, input));
}

export async function sendMessageAction(input: SendMessageInput) {
  const userId = await requireUserId();
  return runAction(() => sendMessage(userId, input));
}

export async function editMessageAction(input: EditMessageInput) {
  const userId = await requireUserId();
  return runAction(() => editMessage(userId, input));
}

export async function deleteMessageAction(input: DeleteMessageInput) {
  const userId = await requireUserId();
  return runAction(() => deleteMessage(userId, input));
}
