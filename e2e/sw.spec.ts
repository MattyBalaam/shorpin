import type { BrowserContext } from "@playwright/test";
import { expect, test } from "./fixtures";

// Delays the SW's sub-fetch for `path` so the SW's 500ms timeout fires and
// serves the loading page — simulating a Netlify cold start.
//
// Uses context.route() (not page.route()) because page.route() intercepts the
// browser's navigate request before the SW sees it. context.route() also
// intercepts subrequests the SW makes, which is the fetch we need to slow down.
// Navigations are skipped (isNavigationRequest) so we only delay the SW's own
// fetch to the origin, not the original navigation event itself.
//
// Filtering by path (instead of "first non-navigation request") prevents
// background requests (e.g. SW update checks to /sw.js) from stealing the
// delay slot and leaving the real SW sub-fetch undelayed.
async function simulateColdStart(context: BrowserContext, path: string) {
  let triggered = false;
  await context.route("**/*", async (route) => {
    const url = new URL(route.request().url());
    if (
      !triggered &&
      !route.request().isNavigationRequest() &&
      !route.request().headers()["x-sw-poll"] &&
      url.pathname === path
    ) {
      triggered = true;
      await new Promise<void>((resolve) => setTimeout(resolve, 700));
    }
    await route.continue();
  });
}

test.describe("service worker cold start", () => {
  test.describe.configure({ retries: 2 });

  test.beforeEach(async ({ page }) => {
    // Navigate once to register, activate (skipWaiting) and claim the client.
    // Subsequent navigations will be intercepted by the SW.
    await page.goto("/login");
    await page.waitForFunction(() => navigator.serviceWorker.controller !== null, {
      timeout: 5000,
    });
  });

  test("shows loading spinner when server is slow", async ({ page, context }) => {
    await simulateColdStart(context, "/forgot-password");
    void page.goto("/forgot-password");
    await expect(page.locator(".spinner")).toBeVisible({ timeout: 2000 });
  });

  test("loads real page after cold-start spinner", async ({ page, context }) => {
    await simulateColdStart(context, "/forgot-password");
    void page.goto("/forgot-password");
    await expect(page.locator(".spinner")).toBeVisible({ timeout: 2000 });
    // Poll with X-SW-Poll header succeeds → location.replace fires → SW serves real HTML
    await expect(page.locator("html[data-hydrated-path='/forgot-password']")).toBeAttached({
      timeout: 5000,
    });
  });

  test("shows error state after max retries", async ({ page, context }) => {
    test.slow(); // 30 × 200ms = ~6s of polling
    await context.setOffline(true);
    void page.goto("/login");
    await expect(page.locator(".spinner")).toBeVisible({ timeout: 2000 });
    await expect(page.locator(".error")).toBeVisible({ timeout: 8000 });
    await expect(page.locator(".spinner")).toBeHidden();
  });

  test("retry button recovers after error state", async ({ page, context }) => {
    test.slow();
    await context.setOffline(true);
    void page.goto("/login");
    await expect(page.locator(".error")).toBeVisible({ timeout: 8000 });
    await context.setOffline(false);
    await page.locator("#retry").click();
    await expect(page.locator("html[data-hydrated-path='/login']")).toBeAttached({ timeout: 5000 });
  });

  test("location.replace keeps loading page out of browser history", async ({ page, context }) => {
    // beforeEach lands on /login. Cold-start a navigation to /forgot-password.
    // After the spinner resolves via location.replace, pressing back should
    // return to /login — not the loading page, which was replaced not pushed.
    await simulateColdStart(context, "/forgot-password");
    void page.goto("/forgot-password");
    await expect(page.locator(".spinner")).toBeVisible({ timeout: 2000 });
    await expect(page.locator("html[data-hydrated-path='/forgot-password']")).toBeAttached({
      timeout: 5000,
    });

    await page.goBack();
    await expect(page.locator(".spinner")).not.toBeVisible({ timeout: 1000 });
    await expect(page.locator("html[data-hydrated-path='/login']")).toBeAttached({ timeout: 2000 });
  });
});
