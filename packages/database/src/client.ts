import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

declare global {
  // eslint-disable-next-line no-var
  var __notionCloneDbClient: ReturnType<typeof buildClient> | undefined;
}

function buildClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set.");
  }
  const queryClient = postgres(connectionString, { max: 10 });
  return drizzle(queryClient, { schema });
}

/** Reused across hot-reloads in dev so we don't exhaust Postgres connections. */
export const db = globalThis.__notionCloneDbClient ?? buildClient();
if (process.env.NODE_ENV !== "production") {
  globalThis.__notionCloneDbClient = db;
}

export type Database = typeof db;
