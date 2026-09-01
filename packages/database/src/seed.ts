/**
 * Optional local-dev convenience: creates one demo account, workspace, and welcome page
 * so a fresh `docker compose up -d && pnpm db:migrate && pnpm db:seed` gives you
 * something to look at immediately. Never run against a shared/staging/production
 * database — it's not idempotent-safe for that (re-running against the same DB creates
 * duplicate demo data beyond the first run's `onConflictDoNothing` on the user's email).
 */
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import * as schema from "./schema";
import { eq } from "drizzle-orm";

const DEMO_EMAIL = "demo@example.com";
const DEMO_PASSWORD = "demo-password-please-change";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set.");

  const client = postgres(connectionString, { max: 1 });
  const db = drizzle(client, { schema });

  const existing = await db.select().from(schema.users).where(eq(schema.users.email, DEMO_EMAIL)).limit(1);
  if (existing[0]) {
    console.log(`Demo user ${DEMO_EMAIL} already exists — skipping seed.`);
    await client.end();
    return;
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const [user] = await db
    .insert(schema.users)
    .values({ name: "Demo User", email: DEMO_EMAIL, passwordHash })
    .returning();
  if (!user) throw new Error("Failed to create demo user.");

  const [workspace] = await db
    .insert(schema.workspaces)
    .values({ name: "Demo Workspace", slug: "demo-workspace", ownerId: user.id })
    .returning();
  if (!workspace) throw new Error("Failed to create demo workspace.");

  await db.insert(schema.workspaceMembers).values({ workspaceId: workspace.id, userId: user.id, role: "owner" });

  const pageId = randomUUID();
  await db.insert(schema.pages).values({
    id: pageId,
    workspaceId: workspace.id,
    title: "Welcome to your workspace",
    sortKey: "a0",
    createdByUserId: user.id,
    lastEditedByUserId: user.id,
  });
  await db.insert(schema.documents).values({
    pageId,
    content: {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Welcome 👋" }] },
        {
          type: "paragraph",
          content: [{ type: "text", text: "This is a seeded demo page. Type '/' to see block commands." }],
        },
      ],
    },
    updatedByUserId: user.id,
  });

  console.log(`Seeded demo account: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
  await client.end();
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
