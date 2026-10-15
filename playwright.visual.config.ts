import { defineConfig, devices } from "@playwright/test";
import baseConfig from "./playwright.config";

// Visual snapshot tests — local only for now. Baselines are rendered by this
// machine's OS and fonts (the file names carry a `-darwin` suffix), so they'd
// mismatch in CI's Linux container. Run in a pinned Docker image before
// adding this to CI. See visual-tests/README.md.
export default defineConfig({
  ...baseConfig,
  testDir: "./visual-tests",
  testIgnore: undefined,
  // The config and sign-ups modals list every user in the shared mock DB, so
  // tests run one at a time against the same seed users (see routes.spec.ts).
  fullyParallel: false,
  workers: 1,
  use: {
    ...baseConfig.use,
    // The service worker's "Offline support ready" toast appears at a
    // timing-dependent point, so keep it out of the snapshots.
    serviceWorkers: "block",
  },
  projects: [
    {
      name: "iphone-pro-max",
      // WebKit, to render with Safari's engine.
      use: devices["iPhone 17 Pro Max"],
    },
    {
      name: "laptop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
