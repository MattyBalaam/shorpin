import { test as base, expect } from "@playwright/test";
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
    const ctx = createTestContext();
    await resetDb(page, ctx);
    await use(ctx);
  },
});
