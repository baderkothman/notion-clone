import { relations } from "drizzle-orm";
import { users, sessions, accounts } from "./identity";
import { workspaces, workspaceMembers, workspaceInvitations } from "./workspaces";
import { pages, favorites } from "./pages";
import { documents } from "./documents";
import { pageShares } from "./permissions";
import { comments, commentMentions } from "./comments";
import { databaseProperties, databaseRowValues, databaseViews } from "./databases";
import { files } from "./files";
import { pageRevisions } from "./history";

export const usersRelations = relations(users, ({ many }) => ({
  sessions: many(sessions),
  accounts: many(accounts),
  memberships: many(workspaceMembers),
  favorites: many(favorites),
  pageShares: many(pageShares),
}));

export const workspacesRelations = relations(workspaces, ({ many, one }) => ({
  owner: one(users, { fields: [workspaces.ownerId], references: [users.id] }),
  members: many(workspaceMembers),
  invitations: many(workspaceInvitations),
  pages: many(pages),
}));

export const workspaceMembersRelations = relations(workspaceMembers, ({ one }) => ({
  workspace: one(workspaces, {
    fields: [workspaceMembers.workspaceId],
    references: [workspaces.id],
  }),
  user: one(users, { fields: [workspaceMembers.userId], references: [users.id] }),
}));

export const pagesRelations = relations(pages, ({ one, many }) => ({
  workspace: one(workspaces, { fields: [pages.workspaceId], references: [workspaces.id] }),
  parent: one(pages, { fields: [pages.parentId], references: [pages.id], relationName: "children" }),
  children: many(pages, { relationName: "children" }),
  document: one(documents, { fields: [pages.id], references: [documents.pageId] }),
  shares: many(pageShares),
  comments: many(comments),
  favoritedBy: many(favorites),
  databaseProperties: many(databaseProperties),
  databaseViews: many(databaseViews),
  rowValues: many(databaseRowValues),
  revisions: many(pageRevisions),
  files: many(files),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  page: one(pages, { fields: [documents.pageId], references: [pages.id] }),
}));

export const commentsRelations = relations(comments, ({ one, many }) => ({
  page: one(pages, { fields: [comments.pageId], references: [pages.id] }),
  author: one(users, { fields: [comments.authorId], references: [users.id] }),
  parent: one(comments, {
    fields: [comments.parentCommentId],
    references: [comments.id],
    relationName: "replies",
  }),
  replies: many(comments, { relationName: "replies" }),
  mentions: many(commentMentions),
}));

export const databasePropertiesRelations = relations(databaseProperties, ({ one, many }) => ({
  database: one(pages, { fields: [databaseProperties.databasePageId], references: [pages.id] }),
  values: many(databaseRowValues),
}));

export const databaseRowValuesRelations = relations(databaseRowValues, ({ one }) => ({
  row: one(pages, { fields: [databaseRowValues.rowPageId], references: [pages.id] }),
  property: one(databaseProperties, {
    fields: [databaseRowValues.propertyId],
    references: [databaseProperties.id],
  }),
}));
