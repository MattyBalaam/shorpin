import { randomUUID } from "node:crypto";
import { expect, type Page } from "@playwright/test";

export interface TestContext {
  ownerEmail: string;
  collabEmail: string;
  waitlistEmail: string;
}

/**
 * Create a unique set of user emails for a test file.
 * Using {username}-{uuid}@test.com ensures parallel workers each get their
 * own isolated users and data in the shared mock DB.
 */
export function createTestContext(): TestContext {
  const uuid = randomUUID();
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
  await expect(
    page.locator(`html[data-hydrated-path="${pathname}"]`),
  ).toBeAttached({ timeout: 300 });
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
