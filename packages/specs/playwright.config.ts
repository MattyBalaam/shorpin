import { defineConfig, devices, type Project } from "@playwright/test";
import { app, appName } from "./apps/index.ts";

const mockPort = process.env.MOCK_SERVER_PORT ?? "9001";
const appPort = process.env.APP_SERVER_PORT ?? "5174";

const useDevServer = process.argv.includes("--dev");

// Specs for one app only live in integration-tests/app-only/<app>/; every
// other app's folder is skipped.
const otherAppsOnly = new RegExp(`/app-only/(?!${appName}/)`);
const supabaseSpecs = "**/supabase-*.spec.ts";

function visualProject(name: string, use: Project["use"]): Project {
  return {
    name,
    grep: /@visual/,
    testIgnore: [supabaseSpecs, otherAppsOnly],
    // The service worker's "Offline support ready" toast appears at a
    // timing-dependent point, so keep it out of the snapshots.
    use: { ...use, serviceWorkers: "block" },
  };
}

export default defineConfig({
  testDir: "./integration-tests",
  // Each app renders its own pixels, so each keeps its own baselines.
  snapshotPathTemplate: `{testDir}/{testFileName}-snapshots/${appName}/{arg}{-projectName}{-snapshotSuffix}{ext}`,
  testIgnore: [supabaseSpecs, otherAppsOnly],
  fullyParallel: true,
  reporter: [["html", { open: "never" }]],
  use: {
    baseURL: `http://localhost:${appPort}`,
    trace: "retain-on-failure",
  },
  projects: [
    {
      // Core flows with JavaScript off, for an app that must work as plain
      // HTML (its app-only no-js.spec.ts).
      name: "no-js",
      use: { javaScriptEnabled: false },
      testMatch: "**/no-js.spec.ts",
    },
    {
      name: "desktop",
      testIgnore: [supabaseSpecs, otherAppsOnly, "**/touch.spec.ts", "**/no-js.spec.ts"],
      grepInvert: /@visual/,
    },
    {
      // Real touch input via Chromium's CDP (see touch.spec.ts) — covers
      // touch-action, pointercancel and pointerType "touch" paths that mouse
      // emulation can't reach. Not a substitute for iOS Safari on a device.
      name: "touch",
      use: devices["Pixel 7"],
      testMatch: "**/touch.spec.ts",
      grepInvert: /@visual/,
    },
    {
      // Behaviour that differs in WebKit, e.g. scroll clamping that Chromium's
      // scroll anchoring hides. Tag a test `@webkit` to run it here as well.
      name: "webkit",
      use: devices["iPhone 17 Pro Max"],
      grep: /@webkit/,
      grepInvert: /@visual/,
    },
    // Visual snapshots — each route spec's `@visual` tests, at two sizes.
    // Local only for now: baselines are macOS renders (`-darwin` suffix) and
    // won't match CI's Linux container until they're generated in Docker.
    ...(process.env.CI
      ? []
      : [
          visualProject("iphone-pro-max", devices["iPhone 17 Pro Max"]),
          visualProject("laptop", {
            ...devices["Desktop Chrome"],
            viewport: { width: 1440, height: 900 },
          }),
        ]),
  ],
  webServer: [
    {
      command: "pnpm --filter @shorpin/mocks start",
      cwd: "../..",
      url: `http://localhost:${mockPort}`,
      env: { MOCK_SERVER_PORT: mockPort },
      reuseExistingServer: !process.env.CI,
      stdout: "pipe",
      stderr: "pipe",
    },
    {
      command: useDevServer ? app.server.dev : app.server.built,
      cwd: "../..",
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
