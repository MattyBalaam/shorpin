import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: {
    baseURL: "http://localhost:5173",
  },
  webServer: [
    {
      command: "pnpm tsx mocks/server.ts",
      url: "http://localhost:9001",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "pnpm dev",
      url: "http://localhost:5173",
      env: {
        VITE_SUPABASE_URL: "http://localhost:9001",
        VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "test-anon-key",
      },
      reuseExistingServer: !process.env.CI,
    },
  ],
});
