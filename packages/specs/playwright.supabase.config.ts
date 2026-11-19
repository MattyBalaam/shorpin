import { loadEnvFile } from "node:process";
import { defineConfig } from "@playwright/test";
import { app, appName } from "./apps/index.ts";

// The app's .env.test.local holds the e2e Supabase project's credentials
// (see its .env.test.local.example), the same file its `dev:e2e` reads. It
// is loaded first so it wins over the app's default .env. Node's loadEnvFile
// keeps the first value seen for a given key, so .env only fills in anything
// .env.test.local doesn't set (e.g. SESSION_SECRET). Neither file exists in
// CI — vars come from secrets.
for (const envFile of [`../../apps/${appName}/.env.test.local`, `../../apps/${appName}/.env`]) {
  try {
    loadEnvFile(envFile);
  } catch {
    // optional file, fall through
  }
}

const appPort = "5175";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "*.spec.ts",
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
    command: app.server.e2e,
    cwd: "../..",
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
