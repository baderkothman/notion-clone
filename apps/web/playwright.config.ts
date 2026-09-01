import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // No `webServer` block: CI and local dev both start the server explicitly
  // (`pnpm build && pnpm start -p 3100`, see docs/TESTING.md) before running this
  // config, rather than letting Playwright manage the process — simpler to reason
  // about when a persistent Postgres/MinIO stack is also required.
});
