"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Hash, MoreHorizontal, Pencil, Plus, Trash2, X } from "lucide-react";
import { Avatar, Button, DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, cn } from "@notion-clone/ui";
import type { ChatChannel } from "@/server/chat/channels";
import type { ChatMessage } from "@/server/chat/messages";
import {
  listMessagesAction,
  sendMessageAction,
  editMessageAction,
  deleteMessageAction,
  createChannelAction,
} from "@/app/(app)/actions/chat";
import { MentionComposer, type MemberOption } from "@/components/page/mention-composer";
import { LocalDateText } from "@/components/local-date-text";

/** Live delivery is short-interval polling, not a push channel — see
 * docs/ARCHITECTURE.md's "Chat" section for why (no queue/worker infra exists in this
 * app yet, same reasoning as the Google Calendar sync section's "no webhook" cut).
 * 3 seconds reads as "basically live" without hammering the server. */
const POLL_INTERVAL_MS = 3000;

export function ChatShell({
  workspaceId,
  currentUserId,
  channels: initialChannels,
  initialChannelId,
  initialMessages,
  members,
}: {
  workspaceId: string;
  currentUserId: string;
  channels: ChatChannel[];
  initialChannelId: string;
  initialMessages: ChatMessage[];
  members: MemberOption[];
}) {
  const [channels, setChannels] = useState(initialChannels);
  const [activeChannelId, setActiveChannelId] = useState(initialChannelId);
  const [messages, setMessages] = useState(initialMessages);
  const [creatingChannel, setCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editBody, setEditBody] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? channels[0]!;

  // Switching channels does a fresh load (not incremental — a different channel's
  // history has nothing in common with what's already in state).
  useEffect(() => {
    let cancelled = false;
    listMessagesAction({ channelId: activeChannelId }).then((result) => {
      if (cancelled || !result.ok) return;
      setMessages(result.value);
    });
    return () => {
      cancelled = true;
    };
  }, [activeChannelId]);

  // Polling picks up only what's new since the last message already in state, so a
  // busy channel doesn't re-fetch (and re-render) its whole history every 3 seconds.
  useEffect(() => {
    const interval = setInterval(async () => {
      const last = messagesRef.current[messagesRef.current.length - 1];
      const result = await listMessagesAction({ channelId: activeChannelId, afterMessageId: last?.id ?? null });
      if (result.ok && result.value.length > 0) {
        setMessages((prev) => [...prev, ...result.value]);
      }
    }, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [activeChannelId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [messages.length, activeChannelId]);

  async function handleSend(body: string, mentionedUserIds: string[]) {
    const result = await sendMessageAction({ channelId: activeChannelId, body, mentionedUserIds });
    if (!result.ok) return toast.error(result.error);
    setMessages((prev) => [...prev, result.value]);
  }

  async function handleCreateChannel(e: React.FormEvent) {
    e.preventDefault();
    const name = newChannelName.trim();
    if (!name) return;
    const result = await createChannelAction({ workspaceId, name });
    if (!result.ok) return toast.error(result.error);
    setChannels((prev) => [...prev, result.value]);
    setActiveChannelId(result.value.id);
    setNewChannelName("");
    setCreatingChannel(false);
  }

  async function handleSaveEdit(messageId: string) {
    const body = editBody.trim();
    if (!body) return;
    const result = await editMessageAction({ messageId, body });
    if (!result.ok) return toast.error(result.error);
    setMessages((prev) => prev.map((m) => (m.id === messageId ? { ...m, body: result.value.body, editedAt: result.value.editedAt } : m)));
    setEditingId(null);
  }

  async function handleDelete(messageId: string) {
    if (!confirm("Delete this message?")) return;
    const result = await deleteMessageAction({ messageId });
    if (!result.ok) return toast.error(result.error);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
  }

  return (
    <div className="flex h-full">
      <div className="w-52 shrink-0 border-r border-border p-3">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium text-text-faint">Channels</p>
          <button
            onClick={() => setCreatingChannel((v) => !v)}
            aria-label="New channel"
            className="flex size-5 items-center justify-center rounded hover:bg-hover"
          >
            <Plus className="size-3.5 text-text-faint" />
          </button>
        </div>
        {creatingChannel ? (
          <form onSubmit={handleCreateChannel} className="mb-2">
            <label htmlFor="new-channel-name" className="mb-1 block text-xs font-medium text-text-muted">
              Channel name
            </label>
            <div className="flex items-center gap-1">
              <input
                id="new-channel-name"
                value={newChannelName}
                onChange={(e) => setNewChannelName(e.target.value)}
                placeholder="e.g. project-alpha"
                autoFocus
                className="h-7 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-focus sm:text-xs"
              />
              <button type="button" onClick={() => setCreatingChannel(false)} aria-label="Cancel" className="text-text-faint hover:text-text">
                <X className="size-3.5" />
              </button>
            </div>
          </form>
        ) : null}
        <div className="space-y-0.5">
          {channels.map((channel) => (
            <button
              key={channel.id}
              onClick={() => setActiveChannelId(channel.id)}
              className={cn(
                "flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm",
                channel.id === activeChannelId ? "bg-selected text-text" : "text-text-muted hover:bg-hover hover:text-text",
              )}
            >
              <Hash className="size-3.5 shrink-0" />
              <span className="truncate">{channel.name}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex h-11 shrink-0 items-center gap-1.5 border-b border-border px-4">
          <Hash className="size-4 text-text-faint" />
          <h1 className="text-sm font-semibold text-text">{activeChannel.name}</h1>
        </div>

        <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {messages.length === 0 ? (
            <p className="py-16 text-center text-sm text-text-faint">No messages yet. Say something.</p>
          ) : (
            <div className="space-y-3">
              {messages.map((message) => {
                const isOwn = message.authorId === currentUserId;
                return (
                  <div key={message.id} className="group flex items-start gap-2.5">
                    <Avatar name={message.authorName ?? message.authorEmail} src={message.authorImage} size={28} className="mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-sm font-medium text-text">{message.authorName ?? message.authorEmail}</span>
                        <span className="text-xs text-text-faint">
                          <LocalDateText value={message.createdAt} format="time" />
                        </span>
                        {message.editedAt ? <span className="text-xs text-text-faint">(edited)</span> : null}
                      </div>
                      {editingId === message.id ? (
                        <form
                          onSubmit={(e) => {
                            e.preventDefault();
                            handleSaveEdit(message.id);
                          }}
                          className="mt-1 flex items-center gap-1.5"
                        >
                          <input
                            value={editBody}
                            onChange={(e) => setEditBody(e.target.value)}
                            autoFocus
                            aria-label="Edit message"
                            className="h-8 min-w-0 flex-1 rounded-md border border-border bg-surface px-2 text-base outline-none focus-visible:ring-2 focus-visible:ring-focus sm:text-sm"
                          />
                          <Button type="submit" size="sm">
                            Save
                          </Button>
                          <Button type="button" variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                            Cancel
                          </Button>
                        </form>
                      ) : (
                        <p className="whitespace-pre-wrap break-words text-sm text-text">{message.body}</p>
                      )}
                    </div>
                    {isOwn && editingId !== message.id ? (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            aria-label="Message options"
                            className="shrink-0 rounded p-1 text-text-faint opacity-100 hover:bg-hover hover:text-text sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100"
                          >
                            <MoreHorizontal className="size-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onSelect={() => {
                              setEditingId(message.id);
                              setEditBody(message.body);
                            }}
                          >
                            <Pencil className="size-3.5" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem destructive onSelect={() => handleDelete(message.id)}>
                            <Trash2 className="size-3.5" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="border-t border-border p-3">
          <MentionComposer members={members} onSubmit={handleSend} placeholder={`Message #${activeChannel.name}`} />
        </div>
      </div>
    </div>
  );
}
