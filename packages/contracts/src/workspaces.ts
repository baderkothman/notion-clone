import { z } from "zod";

export const workspaceRoles = ["owner", "admin", "member", "guest"] as const;
export const workspaceRoleSchema = z.enum(workspaceRoles);
export type WorkspaceRole = z.infer<typeof workspaceRoleSchema>;

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(120),
});
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;

export const updateWorkspaceSchema = z.object({
  workspaceId: z.string().uuid(),
  name: z.string().trim().min(1).max(120).optional(),
  icon: z.string().max(32).nullable().optional(),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3)
    .max(60)
    .regex(slugPattern, "Use lowercase letters, numbers, and hyphens only.")
    .optional(),
});
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;

export const inviteMemberSchema = z.object({
  workspaceId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email(),
  role: workspaceRoleSchema.exclude(["owner"]),
});
export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  workspaceId: z.string().uuid(),
  memberId: z.string().uuid(),
  role: workspaceRoleSchema.exclude(["owner"]),
});
export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

export const removeMemberSchema = z.object({
  workspaceId: z.string().uuid(),
  memberId: z.string().uuid(),
});
export type RemoveMemberInput = z.infer<typeof removeMemberSchema>;

export const revokeInvitationSchema = z.object({
  workspaceId: z.string().uuid(),
  invitationId: z.string().uuid(),
});
export type RevokeInvitationInput = z.infer<typeof revokeInvitationSchema>;

/** Role → capability matrix. The single source of truth other modules import instead of
 * re-deriving "can this role do X" logic ad hoc. */
export const ROLE_CAPABILITIES = {
  owner: {
    manageWorkspace: true,
    manageMembers: true,
    manageBilling: true,
    createPages: true,
    deleteWorkspace: true,
    useCalendar: true,
  },
  admin: {
    manageWorkspace: true,
    manageMembers: true,
    manageBilling: false,
    createPages: true,
    deleteWorkspace: false,
    useCalendar: true,
  },
  member: {
    manageWorkspace: false,
    manageMembers: false,
    manageBilling: false,
    createPages: true,
    deleteWorkspace: false,
    useCalendar: true,
  },
  // Guests are scoped to the specific pages shared with them (see docs/SECURITY.md) —
  // the workspace calendar is a workspace-wide surface, so guests don't get it, the
  // same reasoning that already excludes them from createPages.
  guest: {
    manageWorkspace: false,
    manageMembers: false,
    manageBilling: false,
    createPages: false,
    deleteWorkspace: false,
    useCalendar: false,
  },
} as const satisfies Record<WorkspaceRole, Record<string, boolean>>;
