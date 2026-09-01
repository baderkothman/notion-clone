import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    // Integration tests (need a real Postgres — see vitest.integration.config.ts and
    // `pnpm test:integration`) end in .test.ts too, so they'd otherwise match the glob
    // above and make plain `pnpm test` silently require a database.
    exclude: ["**/*.int.test.ts", "**/node_modules/**"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
