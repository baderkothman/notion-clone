import "server-only";
import { db, pages, favorites, eq, and } from "@notion-clone/database";
import {
  updatePageTitleSchema,
  updatePageIconSchema,
  updatePageCoverSchema,
  toggleFavoriteSchema,
  type UpdatePageTitleInput,
  type UpdatePageIconInput,
  type UpdatePageCoverInput,
  type ToggleFavoriteInput,
} from "@notion-clone/contracts";
import { assertPagePermission } from "../permissions/assert";
import { indexPageTitle } from "../search/index-page";

export async function updatePageTitle(userId: string, raw: UpdatePageTitleInput) {
  const { pageId, title } = updatePageTitleSchema.parse(raw);
  await assertPagePermission(userId, pageId, "edit");
  await db
    .update(pages)
    .set({ title, updatedAt: new Date(), lastEditedByUserId: userId })
    .where(eq(pages.id, pageId));
  await indexPageTitle(pageId, title);
}

export async function updatePageIcon(userId: string, raw: UpdatePageIconInput) {
  const { pageId, icon } = updatePageIconSchema.parse(raw);
  await assertPagePermission(userId, pageId, "edit");
  await db
    .update(pages)
    .set({ icon, updatedAt: new Date(), lastEditedByUserId: userId })
    .where(eq(pages.id, pageId));
}

export async function updatePageCover(userId: string, raw: UpdatePageCoverInput) {
  const { pageId, coverImage } = updatePageCoverSchema.parse(raw);
  await assertPagePermission(userId, pageId, "edit");
  await db
    .update(pages)
    .set({ coverImage, updatedAt: new Date(), lastEditedByUserId: userId })
    .where(eq(pages.id, pageId));
}

export async function toggleFavorite(userId: string, raw: ToggleFavoriteInput) {
  const { pageId, favorite } = toggleFavoriteSchema.parse(raw);
  await assertPagePermission(userId, pageId, "view");

  if (favorite) {
    await db.insert(favorites).values({ userId, pageId }).onConflictDoNothing();
  } else {
    await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.pageId, pageId)));
  }
}
