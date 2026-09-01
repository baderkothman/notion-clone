import { z } from "zod";

export const shareRoles = ["view", "comment", "edit", "full"] as const;
export const shareRoleSchema = z.enum(shareRoles);
export type ShareRole = z.infer<typeof shareRoleSchema>;

/** Ordered weakest → strongest so callers can do `roleRank[a] >= roleRank[b]`. */
export const SHARE_ROLE_RANK: Record<ShareRole, number> = {
  view: 0,
  comment: 1,
  edit: 2,
  full: 3,
};

export const sharePageSchema = z.object({
  pageId: z.string().uuid(),
  email: z.string().trim().toLowerCase().email(),
  role: shareRoleSchema.exclude(["full"]),
});
export type SharePageInput = z.infer<typeof sharePageSchema>;

export const updateShareRoleSchema = z.object({
  pageId: z.string().uuid(),
  userId: z.string().uuid(),
  role: shareRoleSchema.exclude(["full"]),
});
export type UpdateShareRoleInput = z.infer<typeof updateShareRoleSchema>;

export const revokeShareSchema = z.object({
  pageId: z.string().uuid(),
  userId: z.string().uuid(),
});
export type RevokeShareInput = z.infer<typeof revokeShareSchema>;

export const setPageVisibilitySchema = z.object({
  pageId: z.string().uuid(),
  visibility: z.enum(["private", "workspace"]),
});
export type SetPageVisibilityInput = z.infer<typeof setPageVisibilitySchema>;

export const setPublicShareSchema = z.object({
  pageId: z.string().uuid(),
  enabled: z.boolean(),
  role: shareRoleSchema.exclude(["full"]).optional(),
});
export type SetPublicShareInput = z.infer<typeof setPublicShareSchema>;

export interface EffectivePermission {
  role: ShareRole | null;
  source: "explicit" | "inherited" | "workspace" | "public" | "owner" | null;
}
