"use client";

import * as React from "react";
import { toast } from "sonner";
import { Mail, X } from "lucide-react";
import { Avatar, Button, Input } from "@notion-clone/ui";
import type { WorkspaceRole } from "@notion-clone/contracts";
import {
  inviteMemberAction,
  updateMemberRoleAction,
  removeMemberAction,
  revokeInvitationAction,
} from "@/app/(app)/actions/workspaces";

interface Member {
  id: string;
  userId: string;
  name: string | null;
  email: string;
  image: string | null;
  role: WorkspaceRole;
}

interface Invitation {
  id: string;
  email: string;
  role: WorkspaceRole;
  expiresAt: Date;
}

const ASSIGNABLE_ROLES: Exclude<WorkspaceRole, "owner">[] = ["admin", "member", "guest"];

export function MembersManager({
  workspaceId,
  currentUserId,
  canManage,
  initialMembers,
  initialInvitations,
}: {
  workspaceId: string;
  currentUserId: string;
  canManage: boolean;
  initialMembers: Member[];
  initialInvitations: Invitation[];
}) {
  const [members, setMembers] = React.useState(initialMembers);
  const [invitations, setInvitations] = React.useState(initialInvitations);
  const [email, setEmail] = React.useState("");
  const [role, setRole] = React.useState<Exclude<WorkspaceRole, "owner">>("member");
  const [inviting, setInviting] = React.useState(false);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    const result = await inviteMemberAction({ workspaceId, email, role });
    setInviting(false);
    if (!result.ok) return toast.error(result.error);
    toast.success(`Invitation sent to ${email}`);
    setInvitations((prev) => [
      { id: result.value.invitation.id, email, role, expiresAt: result.value.invitation.expiresAt },
      ...prev.filter((i) => i.email !== email),
    ]);
    setEmail("");
  }

  async function handleRoleChange(memberId: string, newRole: Exclude<WorkspaceRole, "owner">) {
    const previous = members;
    setMembers((prev) => prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
    const result = await updateMemberRoleAction({ workspaceId, memberId, role: newRole });
    if (!result.ok) {
      setMembers(previous);
      toast.error(result.error);
    }
  }

  async function handleRemove(memberId: string) {
    if (!confirm("Remove this member from the workspace?")) return;
    const previous = members;
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    const result = await removeMemberAction({ workspaceId, memberId });
    if (!result.ok) {
      setMembers(previous);
      toast.error(result.error);
    }
  }

  async function handleRevoke(invitationId: string) {
    const previous = invitations;
    setInvitations((prev) => prev.filter((i) => i.id !== invitationId));
    const result = await revokeInvitationAction({ workspaceId, invitationId });
    if (!result.ok) {
      setInvitations(previous);
      toast.error(result.error);
    }
  }

  return (
    <div className="space-y-6">
      {canManage ? (
        <form onSubmit={handleInvite} className="flex items-center gap-2">
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Invite by email…"
            required
            className="max-w-xs"
          />
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Exclude<WorkspaceRole, "owner">)}
            className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm capitalize"
          >
            {ASSIGNABLE_ROLES.map((r) => (
              <option key={r} value={r} className="capitalize">
                {r}
              </option>
            ))}
          </select>
          <Button type="submit" disabled={inviting}>
            {inviting ? "Sending…" : "Invite"}
          </Button>
        </form>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-medium text-text-faint">
          {members.length} member{members.length === 1 ? "" : "s"}
        </p>
        <ul className="divide-y divide-border rounded-md border border-border">
          {members.map((member) => (
            <li key={member.id} className="flex items-center gap-3 px-3 py-2.5">
              <Avatar name={member.name ?? member.email} src={member.image} size={28} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-text">
                  {member.name ?? member.email} {member.userId === currentUserId ? "(you)" : ""}
                </p>
                <p className="truncate text-xs text-text-faint">{member.email}</p>
              </div>
              {canManage && member.role !== "owner" ? (
                <select
                  value={member.role}
                  onChange={(e) => handleRoleChange(member.id, e.target.value as Exclude<WorkspaceRole, "owner">)}
                  className="rounded-md border border-border bg-surface px-2 py-1 text-xs capitalize"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              ) : (
                <span className="rounded-md px-2 py-1 text-xs capitalize text-text-muted">{member.role}</span>
              )}
              {canManage && member.role !== "owner" ? (
                <button
                  onClick={() => handleRemove(member.id)}
                  aria-label={`Remove ${member.email}`}
                  className="rounded p-1 text-text-faint hover:bg-hover hover:text-destructive"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </li>
          ))}
        </ul>
      </div>

      {canManage && invitations.length > 0 ? (
        <div>
          <p className="mb-2 text-xs font-medium text-text-faint">Pending invitations</p>
          <ul className="divide-y divide-border rounded-md border border-border">
            {invitations.map((invitation) => (
              <li key={invitation.id} className="flex items-center gap-3 px-3 py-2.5">
                <Mail className="h-4 w-4 shrink-0 text-text-faint" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-text">{invitation.email}</p>
                  <p className="text-xs text-text-faint capitalize">Invited as {invitation.role}</p>
                </div>
                <button
                  onClick={() => handleRevoke(invitation.id)}
                  className="text-xs text-text-faint hover:text-destructive"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
