import { defineConfig } from "vitest/config";
import path from "node:path";

/**
 * Separate from vitest.config.ts (which runs `pnpm test` — fast, no infrastructure) so
 * `pnpm test` never silently needs a database. Run explicitly via
 * `pnpm test:integration` after `docker compose up -d && pnpm db:migrate` — see
 * docs/TESTING.md.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.int.test.ts"],
    testTimeout: 15_000,
    // Integration tests share one Postgres connection pool per test file; running
    // files in parallel workers each opening their own pool is unnecessary overhead
    // for this suite's size and risks connection-limit flakiness.
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      // See test/server-only-shim.ts for why.
      "server-only": path.resolve(__dirname, "./test/server-only-shim.ts"),
    },
  },
});
