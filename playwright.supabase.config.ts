import { loadEnvFile } from "node:process";
import { defineConfig } from "@playwright/test";

// .env.e2e.local holds the e2e Supabase project's credentials (see
// .env.e2e.local.example) and is loaded first so it wins over the
// default .env. Node's loadEnvFile keeps the first value seen for a given
// key, so .env only fills in anything .env.e2e.local doesn't set (e.g.
// SESSION_SECRET). Neither file exists in CI — vars come from secrets.
for (const envFile of [".env.e2e.local", ".env"]) {
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
    // The e2e mode reads .env.e2e.local. (Not `test`: Solid's Vite plugin
    // takes that mode for Vitest and builds the browser runtime into the
    // server, which then 500s on every page.)
    command: `pnpm build:e2e && node .output/server/index.mjs`,
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
