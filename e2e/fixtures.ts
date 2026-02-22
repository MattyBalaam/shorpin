import { test as base } from "@playwright/test";
import { createTestContext, resetDb, type TestContext } from "./helpers";

export { expect } from "@playwright/test";

/**
 * Extends the base Playwright test with a `ctx` fixture that creates a unique
 * per-test TestContext and resets the mock DB before each test. This allows
 * fullyParallel: true — every test is fully isolated even when running
 * concurrently with others in the same file.
 */
export const test = base.extend<{ ctx: TestContext }>({
  ctx: async ({ page }, use) => {
    // DEBUG: forward browser console and errors to the test runner output
    page.on("console", (msg) =>
      console.log(`[browser][${msg.type()}] ${msg.text()}`),
    );
    page.on("pageerror", (err) =>
      console.error(`[browser][pageerror] ${err.message}`),
    );

    const ctx = createTestContext();
    await resetDb(page, ctx);
    await use(ctx);
  },
});
