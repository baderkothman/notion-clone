import "server-only";
import { db, databaseProperties, databaseViews } from "@notion-clone/database";
import { newId } from "@notion-clone/shared";
import type { CreatePageInput, SelectOption } from "@notion-clone/contracts";
import { createPage } from "../pages/create";
import { defaultStatusOptions } from "./properties";

/** Fixed, not user-configurable at creation time — same reasoning as Status's seeded
 * options (properties.ts): a task list should be immediately usable, and "how many
 * priority levels, what colors" isn't a decision worth asking for up front. Ordered
 * highest first so Table view's default (unsorted, insertion order) still reads
 * top-to-bottom as most-to-least urgent if a property picker ever lists them in this
 * order. */
function defaultPriorityOptions(): SelectOption[] {
  return [
    { id: newId(), name: "Urgent", color: "red" },
    { id: newId(), name: "High", color: "orange" },
    { id: newId(), name: "Normal", color: "blue" },
    { id: newId(), name: "Low", color: "gray" },
  ];
}

/**
 * The "New → Task list" quick-start: a database pre-provisioned with the properties a
 * task actually needs (Status, Priority, Due date, Assignee) and a Board view grouped
 * by Status as the default, so it opens as a real kanban board immediately — not a
 * blank database the user has to configure by hand before it resembles one. Everything
 * here is still an ordinary database under the hood (same schema, same Table/List/
 * Calendar views available, same row-is-a-page machinery), so task rows get comments,
 * sharing, and the block editor for free exactly like any other database row — this
 * function only changes what's pre-populated at creation time.
 */
export async function createTaskList(userId: string, input: Omit<CreatePageInput, "type">) {
  const page = await createPage(userId, { ...input, type: "database", title: input.title ?? "Tasks" });

  const [, statusProperty] = await db
    .insert(databaseProperties)
    .values([
      { databasePageId: page.id, name: "Name", type: "title", position: 0, config: {} },
      {
        databasePageId: page.id,
        name: "Status",
        type: "status",
        position: 1,
        config: { options: defaultStatusOptions() },
      },
      {
        databasePageId: page.id,
        name: "Priority",
        type: "select",
        position: 2,
        config: { options: defaultPriorityOptions() },
      },
      { databasePageId: page.id, name: "Due date", type: "date", position: 3, config: {} },
      { databasePageId: page.id, name: "Assignee", type: "person", position: 4, config: {} },
    ])
    .returning();

  await db.insert(databaseViews).values([
    {
      databasePageId: page.id,
      name: "Board",
      type: "board",
      position: 0,
      config: { filters: [], sorts: [], groupByPropertyId: statusProperty!.id },
    },
    { databasePageId: page.id, name: "Table", type: "table", position: 1, config: { filters: [], sorts: [] } },
  ]);

  return page;
}
