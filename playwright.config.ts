import { defineConfig } from "@playwright/test";

const mockPort = process.env.MOCK_SERVER_PORT ?? "9001";
const appPort = process.env.APP_SERVER_PORT ?? "5174";

export default defineConfig({
  testDir: "./integration-tests",
  testIgnore: ["**/supabase-*.spec.ts"],
  fullyParallel: true,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${appPort}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node --experimental-strip-types mocks/server.ts",
      url: `http://localhost:${mockPort}`,
      env: { MOCK_SERVER_PORT: mockPort },
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: `pnpm exec react-router dev --mode mock --port ${appPort}`,
      url: `http://localhost:${appPort}`,
      env: {
        VITE_SUPABASE_URL: `http://localhost:${mockPort}`,
        VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "test-anon-key",
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
