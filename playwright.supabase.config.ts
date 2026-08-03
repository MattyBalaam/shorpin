import { loadEnvFile } from "node:process";
import { defineConfig } from "@playwright/test";

// .env.test.local holds the e2e Supabase project's credentials (see
// .env.test.local.example) and is loaded first so it wins over the
// default .env. Node's loadEnvFile keeps the first value seen for a given
// key, so .env only fills in anything .env.test.local doesn't set (e.g.
// SESSION_SECRET). Neither file exists in CI — vars come from secrets.
for (const envFile of [".env.test.local", ".env"]) {
  try {
    loadEnvFile(envFile);
  } catch {
    // optional file, fall through
  }
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
