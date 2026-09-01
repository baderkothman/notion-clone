import { z } from "zod";
import { JSONContent } from "./json-content";

export const createPageSchema = z.object({
  workspaceId: z.string().uuid(),
  parentId: z.string().uuid().nullable().optional(),
  title: z.string().max(2000).optional(),
  type: z.enum(["page", "database"]).optional(),
  /** Position to insert relative to (used for "insert page below X"); omit to append. */
  afterSortKey: z.string().nullable().optional(),
});
export type CreatePageInput = z.infer<typeof createPageSchema>;

export const updatePageTitleSchema = z.object({
  pageId: z.string().uuid(),
  title: z.string().max(2000),
});
export type UpdatePageTitleInput = z.infer<typeof updatePageTitleSchema>;

export const updatePageIconSchema = z.object({
  pageId: z.string().uuid(),
  icon: z.string().max(64).nullable(),
});
export type UpdatePageIconInput = z.infer<typeof updatePageIconSchema>;

export const updatePageCoverSchema = z.object({
  pageId: z.string().uuid(),
  coverImage: z.string().url().max(2000).nullable(),
});
export type UpdatePageCoverInput = z.infer<typeof updatePageCoverSchema>;

export const movePageSchema = z.object({
  pageId: z.string().uuid(),
  newParentId: z.string().uuid().nullable(),
  afterSortKey: z.string().nullable().optional(),
  beforeSortKey: z.string().nullable().optional(),
});
export type MovePageInput = z.infer<typeof movePageSchema>;

export const duplicatePageSchema = z.object({ pageId: z.string().uuid() });
export type DuplicatePageInput = z.infer<typeof duplicatePageSchema>;

export const archivePageSchema = z.object({ pageId: z.string().uuid() });
export type ArchivePageInput = z.infer<typeof archivePageSchema>;

export const restorePageSchema = z.object({ pageId: z.string().uuid() });
export type RestorePageInput = z.infer<typeof restorePageSchema>;

export const deletePagePermanentlySchema = z.object({ pageId: z.string().uuid() });
export type DeletePagePermanentlyInput = z.infer<typeof deletePagePermanentlySchema>;

export const toggleFavoriteSchema = z.object({
  pageId: z.string().uuid(),
  favorite: z.boolean(),
});
export type ToggleFavoriteInput = z.infer<typeof toggleFavoriteSchema>;

/** Autosave write. `expectedVersion` implements optimistic concurrency: the server
 * rejects with a ConflictError if the stored version has moved on, so a stale tab never
 * silently clobbers a newer edit — see docs/SECURITY.md "Autosave" and
 * apps/web/src/server/blocks/save-document.ts. */
export const saveDocumentSchema = z.object({
  pageId: z.string().uuid(),
  content: z.custom<JSONContent>((v) => typeof v === "object" && v !== null),
  expectedVersion: z.number().int().nonnegative(),
});
export type SaveDocumentInput = z.infer<typeof saveDocumentSchema>;

export interface PageTreeNode {
  id: string;
  title: string;
  icon: string | null;
  type: "page" | "database";
  parentId: string | null;
  hasChildren: boolean;
  isArchived: boolean;
  /** Used by drag-and-drop reordering to compute the new sibling's sort key. */
  sortKey: string;
}
