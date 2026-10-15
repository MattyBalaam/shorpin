import { createHash } from "node:crypto";
import { expect, type Locator, type Page, type TestInfo } from "@playwright/test";
import type { Route } from "@playwright/test";

export interface TestContext {
  ownerEmail: string;
  collabEmail: string;
  waitlistEmail: string;
}

/**
 * Create a unique set of user emails for a test.
 * Using {username}-{uuid}@test.com ensures parallel workers each get their
 * own isolated users and data in the shared mock DB. The uuid is derived from
 * the test (and project), not random, so emails shown on screen stay the same
 * between runs for visual snapshots.
 */
export function createTestContext(testInfo: TestInfo): TestContext {
  const hex = createHash("sha256")
    .update(`${testInfo.testId}:${testInfo.repeatEachIndex}`)
    .digest("hex");
  const uuid = [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join("-");
  return {
    ownerEmail: `owner-${uuid}@test.com`,
    collabEmail: `collab-${uuid}@test.com`,
    waitlistEmail: `pending-${uuid}@test.com`,
  };
}

/**
 * Asserts that the app has hydrated at the given pathname within 300ms.
 * Fails the test if React hasn't committed an effect for that route in time,
 * which typically means the form was submitted before hydration completed.
 */
async function waitForHydration(page: Page, pathname: string) {
  await expect(page.locator(`html[data-hydrated-path="${pathname}"]`)).toBeAttached({
    timeout: 300,
  });
}

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await waitForHydration(page, "/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("any-password"); // mock ignores the password
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}

/**
 * Intercepts the first GET matching `urlPattern` and holds it until the
 * returned `release()` is called. Subsequent matching GETs pass through
 * immediately so they don't accumulate after the test releases.
 *
 * Usage:
 *   const { intercepted, release } = await holdLoader(page, /\/lists\/shopping\.data/);
 *   await triggerSomething();
 *   await intercepted; // wait until the request is actually held
 *   // assert loading state...
 *   release();
 */
export async function holdLoader(
  page: Page,
  urlPattern: RegExp,
): Promise<{ intercepted: Promise<void>; release: () => void }> {
  let release!: () => void;
  let blocked = false;
  const intercepted = new Promise<void>((resolveIntercepted) => {
    void page.route(urlPattern, async (route: Route, request) => {
      if (request.method() === "GET" && !blocked) {
        blocked = true;
        await new Promise<void>((r) => {
          release = r;
          resolveIntercepted();
        });
      }
      await route.continue();
    });
  });
  return { intercepted, release: () => release() };
}

/**
 * Reset the mock DB to its initial seed state for the given test context.
 * Only data belonging to ctx's users is cleared and re-seeded, so parallel
 * workers running different test files don't interfere with each other.
 */
export async function resetDb(page: Page, ctx: TestContext) {
  const mockPort = process.env.MOCK_SERVER_PORT ?? "9001";
  await page.request.post(`http://localhost:${mockPort}/test/reset`, {
    data: ctx,
  });
}

/**
 * Visual snapshot of the current page, for `@visual` tests (run by the
 * iphone-pro-max and laptop projects only — see playwright.config.ts).
 * Waits for hydration and web fonts so the screenshot is stable. `mask`
 * paints over content that changes between runs, like dates.
 */
export async function expectPageSnapshot(
  page: Page,
  name: string,
  { mask }: { mask?: Locator[] } = {},
) {
  const { pathname } = new URL(page.url());
  await expect(page.locator(`html[data-hydrated-path="${pathname}"]`)).toBeAttached();
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: true, mask });
}
