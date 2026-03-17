import { loadEnvFile } from "node:process";
import { defineConfig } from "@playwright/test";

try {
  loadEnvFile(".env");
} catch {
  // .env is optional in CI (vars come from secrets)
}

const appPort = "5175";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "supabase-smoke.spec.ts",
  globalSetup: "./e2e/supabase-setup.ts",
  globalTeardown: "./e2e/supabase-teardown.ts",
  fullyParallel: false,
  workers: 1,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${appPort}`,
    trace: "retain-on-failure",
  },
  webServer: {
    command: `pnpm react-router build && pnpm react-router-serve ./build/server/index.js`,
    url: `http://localhost:${appPort}`,
    env: {
      VITE_SUPABASE_URL: process.env.VITE_SUPABASE_URL ?? "",
      VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY:
        process.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ?? "",
      PORT: appPort,
    },
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    stdout: "pipe",
    stderr: "pipe",
  },
});
