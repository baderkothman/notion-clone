import { notFound } from "next/navigation";
import { requireUserId } from "@/server/session";
import { getWorkspaceBySlugForUser, listWorkspaceMembers } from "@/server/workspaces/queries";
import { listChannels, ensureDefaultChannel } from "@/server/chat/channels";
import { listMessages } from "@/server/chat/messages";
import { ROLE_CAPABILITIES } from "@notion-clone/contracts";
import { ChatShell } from "@/components/chat/chat-shell";

export default async function ChatPage({ params }: { params: Promise<{ workspaceSlug: string }> }) {
  const [{ workspaceSlug }, userId] = await Promise.all([params, requireUserId()]);
  const workspace = await getWorkspaceBySlugForUser(userId, workspaceSlug);
  if (!workspace) notFound();
  // Guests are scoped to specific shared pages, not workspace-wide chat — see
  // ROLE_CAPABILITIES's `useChat` doc comment in workspaces.ts.
  if (!ROLE_CAPABILITIES[workspace.role].useChat) notFound();

  // Chat has no setup step — the first visit provisions "general" on the fly (see
  // ensureDefaultChannel's doc comment) rather than showing an empty channel list.
  await ensureDefaultChannel(userId, workspace.id);

  const [channels, members] = await Promise.all([
    listChannels(userId, workspace.id),
    listWorkspaceMembers(workspace.id),
  ]);
  const defaultChannel = channels.find((c) => c.isDefault) ?? channels[0]!;
  const initialMessages = await listMessages(userId, { channelId: defaultChannel.id });

  return (
    <ChatShell
      workspaceId={workspace.id}
      currentUserId={userId}
      channels={channels}
      initialChannelId={defaultChannel.id}
      initialMessages={initialMessages}
      members={members.map((m) => ({ userId: m.userId, name: m.name, email: m.email, image: m.image }))}
    />
  );
}
