import "server-only";
import { db, databaseProperties, databaseViews } from "@notion-clone/database";
import { createPage } from "../pages/create";
import type { CreatePageInput } from "@notion-clone/contracts";

/** Creates a database page with a starter schema: a required `title` property (every
 * database has exactly one — it's what backs each row's actual page title, see
 * packages/database/src/schema/databases.ts) and a default Table view, so a newly
 * created database is immediately usable instead of an empty shell with nothing to look
 * at. */
export async function createDatabase(userId: string, input: Omit<CreatePageInput, "type">) {
  const page = await createPage(userId, { ...input, type: "database", title: input.title ?? "Untitled" });

  await db.insert(databaseProperties).values({
    databasePageId: page.id,
    name: "Name",
    type: "title",
    position: 0,
    config: {},
  });

  await db.insert(databaseViews).values({
    databasePageId: page.id,
    name: "Table",
    type: "table",
    position: 0,
    config: { filters: [], sorts: [] },
  });

  return page;
}
