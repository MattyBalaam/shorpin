import { expect, test } from "./fixtures";
import { login } from "./helpers";

// SW-shaped assertions live here, separate from the per-route offline CRUD
// specs (list.spec.ts, home.spec.ts): this file needs a different lifecycle
// (warm the SW up online, then go offline) and inspects browser-level state
// (Service Worker registration, Cache Storage) rather than app UI. The SW
// only registers in production-ish builds (import.meta.env.PROD), so these
// tests need the default (non---dev) `pnpm test:integration` build — CI
// already runs that variant.

test("service worker registers and precaches the app shell", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  const registration = await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return { scope: reg.scope, scriptURL: reg.active?.scriptURL };
  });
  expect(registration.scriptURL).toContain("/sw.js");

  const precacheEntryCounts = await page.evaluate(async () => {
    const keys = await caches.keys();
    const counts: Record<string, number> = {};
    for (const key of keys) {
      counts[key] = (await (await caches.open(key)).keys()).length;
    }
    return counts;
  });
  const totalEntries = Object.values(precacheEntryCounts).reduce((sum, n) => sum + n, 0);
  expect(totalEntries).toBeGreaterThan(0);
});

test("navigating offline to an uncached route shows the offline fallback shell, not a browser error page", async ({
  page,
  context,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  // Let the SW finish installing/activating and precaching before going
  // offline — it needs to have already cached offline.html to serve it.
  await page.evaluate(() => navigator.serviceWorker.ready);

  await context.setOffline(true);

  // /sign-ups has no clientLoader-based offline handling of its own (scope
  // is deliberately limited to home + list) — a real network attempt here
  // fails, forcing the SW's navigation fallback rather than app-level
  // IndexedDB-backed caching to handle it.
  await page.goto("/sign-ups");
  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
});

test("hard reload while offline shows the last-cached page, not the generic offline shell", async ({
  page,
  context,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  await page.evaluate(() => navigator.serviceWorker.ready);

  // A real (non-SPA) navigation, so the SW's navigate handler actually sees
  // it and runtime-caches the response — matches how a hard reload/cold
  // open reaches the SW, unlike React Router's client-side transitions.
  await page.goto("/lists/shopping");
  await expect(page.getByLabel("Edit Milk")).toBeVisible();

  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole("heading", { name: "You're offline" })).toHaveCount(0);
  await expect(page.getByLabel("Edit Milk")).toBeVisible();
});

test("an offline edit still queues successfully even when Background Sync is unavailable", async ({
  page,
  context,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  await page.evaluate(() => navigator.serviceWorker.ready);

  // Headless Chromium (this test environment included) commonly disables
  // Background Sync outright ("UnknownError: Background Sync is disabled"),
  // regardless of "SyncManager" in window being true. offline-store.client.ts's
  // enqueueMutation treats the registration call as strictly best-effort
  // (wrapped in its own try/catch) for exactly this reason — the offline
  // edit itself must still succeed and queue whether or not the browser
  // can actually register the sync tag. That resilience, not the
  // registration call's own success, is what this test verifies.
  await context.setOffline(true);
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();

  await page.getByLabel("New list").fill("Sync Tag Test");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByText("Sync Tag Test (pending", { exact: false })).toBeVisible();
});
