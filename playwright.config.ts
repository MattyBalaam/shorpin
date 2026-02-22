import { defineConfig } from "@playwright/test";

const mockPort = process.env.MOCK_SERVER_PORT ?? "9001";
const appPort = process.env.APP_SERVER_PORT ?? "5174";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${appPort}`,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "pnpm tsx mocks/server.ts",
      url: `http://localhost:${mockPort}`,
      env: { MOCK_SERVER_PORT: mockPort },
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: `pnpm react-router build --mode mock && pnpm react-router-serve ./build/server/server-build.js`,
      url: `http://localhost:${appPort}`,
      env: {
        VITE_SUPABASE_URL: `http://localhost:${mockPort}`,
        VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY: "test-anon-key",
        PORT: appPort,
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      stdout: "pipe",
      stderr: "pipe",
    },
  ],
});
