import { test as base } from "@playwright/test";
import { app, createTestContext, resetDb, type TestContext } from "./helpers";

export { expect } from "@playwright/test";

/**
 * Extends the base Playwright test with a `ctx` fixture that creates a unique
 * per-test TestContext and resets the mock DB before each test. This allows
 * fullyParallel: true — every test is fully isolated even when running
 * concurrently with others in the same file.
 */
export const test = base.extend<{ ctx: TestContext; parityGap: void }>({
  // Marks this test fixme for apps that list it as a parity gap, so the gap
  // shows in every report rather than as a deleted or failing test.
  parityGap: [
    // oxlint-disable-next-line no-empty-pattern -- Playwright needs the destructuring
    async ({}, use, testInfo) => {
      const gap = app.parityGaps.find(({ title }) =>
        typeof title === "string" ? title === testInfo.title : title.test(testInfo.title),
      );
      testInfo.fixme(gap !== undefined, gap?.reason);
      await use();
    },
    { auto: true },
  ],
  ctx: async ({ page }, use, testInfo) => {
    // DEBUG: forward browser console and errors to the test runner output
    page.on("console", (msg) => console.log(`[browser][${msg.type()}] ${msg.text()}`));
    page.on("pageerror", (err) => console.error(`[browser][pageerror] ${err.message}`));

    const ctx = createTestContext(testInfo);
    await resetDb(page, ctx);
    await use(ctx);
  },
});
