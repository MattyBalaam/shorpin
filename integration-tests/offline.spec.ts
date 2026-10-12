import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
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

test("navigating back to a visited list while the network is down shows the cached list, even before the browser reports offline", async ({
  page,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: "Shopping" }).first().click();
  await expect(page.getByLabel("Edit Milk")).toBeVisible();
  await page.getByRole("link", { name: "Back to index" }).click();
  await expect(page.getByLabel("New list")).toBeVisible();

  // Kill the network without flipping navigator.onLine — what a real device
  // does in the gap before it notices the connection has gone. Every loader
  // (root's included) attempts, and fails, a real fetch.
  await page.route(/\.data|__manifest/, (route) => route.abort("internetdisconnected"));

  await page.getByRole("link", { name: "Shopping" }).first().click();
  await expect(page.getByLabel("Edit Milk")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
});

test("cancelling the network error modal goes back to the previous page", async ({
  page,
  context,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  await expect(page.getByLabel("New list")).toBeVisible();

  // /sign-ups has no offline cache, so an SPA navigation to it while
  // offline lands on the network error modal.
  await context.setOffline(true);
  await page.getByRole("link", { name: /pending/ }).click();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();

  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByLabel("New list")).toBeVisible();
});

// Playwright can't intercept the browser's own fetch of a worker script
// (page/context routes and CDP Fetch all miss it), so a redeploy is simulated
// for real: append a comment to the built sw.js for the duration of the test.
// The result is still a valid worker, so tests running in parallel just
// install it as a first install in their fresh contexts.
const builtWorkerPath = path.resolve("build/client/sw.js");

test("a redeployed service worker waits and offers a reload instead of taking over", async ({
  page,
  ctx,
}) => {
  test.skip(!existsSync(builtWorkerPath), "Needs the built app (not --dev)");

  await login(page, ctx.ownerEmail);
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null);
  // The first-ever install activates straight away — that's not an update.
  await expect(page.getByText("A new version is available")).toHaveCount(0);

  const original = await readFile(builtWorkerPath, "utf8");
  try {
    await writeFile(builtWorkerPath, `${original}\n// next build ${ctx.ownerEmail}\n`);
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      await registration?.update();
    });

    await expect(page.getByText("A new version is available")).toBeVisible();
  } finally {
    await writeFile(builtWorkerPath, original);
  }

  // Installed, but not in control of the page until the user accepts.
  expect(
    await page.evaluate(async () => {
      const registration = await navigator.serviceWorker.getRegistration();
      return registration?.waiting !== null;
    }),
  ).toBe(true);

  await page.evaluate(() => {
    (window as Window & { beforeReload?: boolean }).beforeReload = true;
  });
  const reloaded = page.waitForEvent("load");
  await page.getByRole("button", { name: "Reload" }).click();
  await reloaded;

  expect(
    await page.evaluate(() => (window as Window & { beforeReload?: boolean }).beforeReload),
  ).toBeUndefined();
  await page.waitForFunction(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    return registration?.waiting === null && navigator.serviceWorker.controller !== null;
  });
});
