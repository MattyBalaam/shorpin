import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { expectPageSnapshot, login } from "./helpers";

const baseURL = `http://localhost:${process.env.APP_SERVER_PORT ?? "5174"}`;

const listPath = (slug: string) => `/lists/${slug}`;

/**
 * Navigate straight to the list route and wait for client hydration.
 * The delete-capture and "Recreate last deleted" affordances are driven by
 * client-side React state, so tests must not interact until the route has
 * hydrated (signalled by root.tsx setting data-hydrated-path).
 */
async function openList(page: Page, slug: string) {
  await page.goto(listPath(slug));
  await page.waitForURL(listPath(slug));
  await expect(page.locator(`html[data-hydrated-path="${listPath(slug)}"]`)).toBeAttached();
}

function queuedMutationCount(page: Page) {
  return page.evaluate(
    () =>
      new Promise<number>((resolve, reject) => {
        const open = indexedDB.open("shorpin-offline");
        open.onerror = () => reject(open.error);
        open.onsuccess = () => {
          const count = open.result
            .transaction("mutation-queue")
            .objectStore("mutation-queue")
            .count();
          count.onsuccess = () => resolve(count.result);
          count.onerror = () => reject(count.error);
        };
      }),
  );
}

test("list shows all items", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  await expect(page.getByLabel("Edit Milk")).toBeVisible();
  await expect(page.getByLabel("Edit Bread")).toBeVisible();
  await expect(page.getByLabel("Edit Eggs")).toBeVisible();
});

test("list empty list shows the placeholder prompt", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "owner-empty");

  // The only textbox on an empty list is the "add new item" input
  await expect(page.getByRole("textbox")).toHaveCount(1);
  await expect(page.getByText("No items yet — add one below")).toBeVisible();
});

test("owner can add an item on list", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "owner-empty");

  await page.getByLabel("New item").fill("Butter");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByLabel("Edit Butter")).toBeVisible();
});

test("an item added to a long list is scrolled into view", async ({ page, ctx }) => {
  // A short viewport so a handful of rows overflows the list's scroll area.
  await page.setViewportSize({ width: 375, height: 420 });
  await login(page, ctx.ownerEmail);
  await openList(page, "owner-empty");

  for (const value of ["One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight"]) {
    await page.getByLabel("New item").fill(value);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByLabel(`Edit ${value}`)).toBeInViewport();
  }
});

test("item with a URL shows a single open-link control", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "owner-empty");

  await page.getByLabel("New item").fill("Docs https://example.com/guide");
  await page.getByRole("button", { name: "Add" }).click();

  const itemRow = page
    .locator("li")
    .filter({ has: page.getByLabel("Edit Docs https://example.com/guide") });
  const openLink = itemRow.getByRole("link", { name: "Open link" });

  await expect(openLink).toBeVisible();
  await expect(openLink).toHaveAttribute("href", "https://example.com/guide");
  await expect(itemRow.getByRole("link")).toHaveCount(1);
});

test("deleting an item reveals a browser-only 'Recreate last deleted' button", async ({
  page,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  // No recreate affordance until something has been deleted this session
  await expect(page.getByRole("button", { name: "Recreate last deleted" })).toHaveCount(0);

  await page.getByRole("button", { name: "Delete Milk" }).click();

  await expect(page.getByLabel("Edit Milk")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Recreate last deleted" })).toBeVisible();
  // Deliberately not an undo — no server undelete round-trip
  await expect(page.getByRole("button", { name: "Undo" })).toHaveCount(0);
});

test("'Recreate last deleted' re-adds the deleted value as a fresh item", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  await page.getByRole("button", { name: "Delete Milk" }).click();
  await expect(page.getByLabel("Edit Milk")).not.toBeVisible();

  await page.getByRole("button", { name: "Recreate last deleted" }).click();

  // Milk returns (as a freshly-added item at the end of the list)
  await expect(page.getByLabel("Edit Milk")).toBeVisible();
  // The affordance clears once the value has been recreated
  await expect(page.getByRole("button", { name: "Recreate last deleted" })).toHaveCount(0);
});

/**
 * Drags a row horizontally from its drag handle, the gesture that both
 * reorders (vertical) and swipe-deletes (horizontal) list items.
 */
async function swipeHandle(
  page: Page,
  label: string,
  {
    distance,
    steps,
    holdBeforeRelease = 0,
  }: { distance: number; steps: number; holdBeforeRelease?: number },
) {
  const box = await page.getByLabel(label).boundingBox();
  if (!box) throw new Error(`Unable to determine position of "${label}"`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + distance, y, { steps });
  if (holdBeforeRelease) await page.waitForTimeout(holdBeforeRelease);
  await page.mouse.up();
}

test("swiping an item far enough deletes it and persists", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  // Slow swipe well past the distance threshold so velocity plays no part.
  await swipeHandle(page, "Reorder Milk", { distance: -200, steps: 20, holdBeforeRelease: 200 });

  await expect(page.getByLabel("Edit Milk")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Recreate last deleted" })).toBeVisible();

  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Milk")).toHaveCount(0);
  await expect(page.getByLabel("Edit Bread")).toBeVisible();
  await expect(page.getByLabel("Edit Eggs")).toBeVisible();
});

test("a quick short fling deletes an item", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  // Under the distance threshold, but fast enough to count as a fling.
  // Dispatched in-page: page.mouse steps are separate CDP round trips, and on
  // a loaded CI runner their spacing alone can drop velocity under threshold.
  await page.getByLabel("Reorder Bread").evaluate(async (handle) => {
    const { x, y, width, height } = handle.getBoundingClientRect();
    const init = (dx: number): PointerEventInit => ({
      pointerId: 1,
      isPrimary: true,
      bubbles: true,
      button: 0,
      clientX: x + width / 2 + dx,
      clientY: y + height / 2,
    });

    handle.dispatchEvent(new PointerEvent("pointerdown", init(0)));
    for (const dx of [30, 60, 90]) {
      await new Promise((resolve) => setTimeout(resolve, 10));
      window.dispatchEvent(new PointerEvent("pointermove", init(dx)));
    }
    window.dispatchEvent(new PointerEvent("pointerup", init(90)));
  });

  await expect(page.getByLabel("Edit Bread")).not.toBeVisible();
  await expect(page.getByLabel("Edit Milk")).toBeVisible();
});

test("a slow short swipe springs the item back instead of deleting", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  await swipeHandle(page, "Reorder Eggs", { distance: -80, steps: 10, holdBeforeRelease: 200 });

  const row = page.locator("li").filter({ has: page.getByLabel("Edit Eggs") });
  await expect(row).toBeVisible();
  // Settles back to rest with no leftover offset or lift.
  await expect(row).toHaveCSS("transform", "none");
  await expect(page.getByRole("button", { name: "Recreate last deleted" })).toHaveCount(0);
});

test("editing an item in the modal saves the new value", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  await page.getByRole("button", { name: "Edit Milk" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit item" });
  await expect(dialog.getByLabel("Item")).toHaveValue("Milk");

  await dialog.getByLabel("Item").fill("Oat Milk");
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit Oat Milk" })).toBeVisible();
  // Values are plain text now, not editable fields.
  await expect(page.locator("li textarea")).toHaveCount(0);

  await openList(page, "shopping");
  await expect(page.getByRole("button", { name: "Edit Oat Milk" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Edit Milk" })).toHaveCount(0);
});

test("pressing Enter in the edit modal saves", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  await page.getByRole("button", { name: "Edit Bread" }).click();
  const textarea = page.getByRole("dialog", { name: "Edit item" }).getByLabel("Item");
  await textarea.fill("Sourdough");
  await textarea.press("Enter");

  await expect(page.getByRole("button", { name: "Edit Sourdough" })).toBeVisible();
});

test("cancelling the edit modal leaves the item unchanged", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  for (const dismiss of ["cancel button", "escape"] as const) {
    await page.getByRole("button", { name: "Edit Eggs" }).click();
    const dialog = page.getByRole("dialog", { name: "Edit item" });
    await dialog.getByLabel("Item").fill("Duck eggs");
    if (dismiss === "escape") await page.keyboard.press("Escape");
    else await dialog.getByRole("button", { name: "Cancel" }).click();

    await expect(dialog).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Edit Eggs" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Edit Duck eggs" })).toHaveCount(0);
  }
});

test("when offline, the offline indicator appears and cached list data remains visible", async ({
  page,
  ctx,
  context,
}) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Milk")).toBeVisible();

  await context.setOffline(true);

  await expect(page.getByText("Offline", { exact: true })).toBeVisible();
  // Items should remain visible from the clientLoader cache
  await expect(page.getByLabel("Edit Milk")).toBeVisible();
  await expect(page.getByLabel("Edit Bread")).toBeVisible();
  await expect(page.getByLabel("Edit Eggs")).toBeVisible();
});

test("an item added offline syncs to the server on reconnect", async ({ page, ctx, context }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Milk")).toBeVisible();

  await context.setOffline(true);
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();

  // Add while offline — the clientAction stores it locally. Generous
  // timeout: under full-suite load this client-side-only step has been
  // observed occasionally slow, consistent with resource contention rather
  // than a functional issue — it's instant and 100% reliable in isolation.
  await page.getByLabel("New item").fill("Offline butter");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByLabel("Edit Offline butter")).toBeVisible({ timeout: 10000 });

  // Reconnect sync fetches fresh server state before rebasing and
  // resubmitting (so it doesn't resurrect anything changed concurrently by
  // another device) — wait for that resubmission to actually land before
  // reloading, rather than just the "syncing" toast, since a full reload
  // aborts any request still in flight.
  const syncSubmitted = page.waitForResponse(
    (response) =>
      response.url().includes("/lists/shopping.data") && response.request().method() === "POST",
  );

  await context.setOffline(false);

  // onOnline fires: resubmit persists the local edits, indicator clears
  await expect(page.getByText("Back online - syncing changes")).toBeVisible();
  await syncSubmitted;
  await expect(page.getByText("Offline", { exact: true })).not.toBeVisible();

  // The offline item must survive a full reload — i.e. it reached the server
  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Offline butter")).toBeVisible();
});

test("an add that fails before the browser reports offline is queued, not an error", async ({
  page,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Milk")).toBeVisible();

  // A dead connection that navigator.onLine hasn't noticed yet — what a
  // phone does for a few seconds after losing signal.
  await page.route("**/lists/shopping.data*", (route) => route.abort("internetdisconnected"));

  await page.getByLabel("New item").fill("Lie-fi butter");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByLabel("Edit Lie-fi butter")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toHaveCount(0);
  await expect.poll(() => queuedMutationCount(page)).toBeGreaterThan(0);

  // No offline→online transition happens, so the sync's own backoff retry
  // has to deliver it once the server is reachable.
  await page.unroute("**/lists/shopping.data*");
  await expect.poll(() => queuedMutationCount(page), { timeout: 10000 }).toBe(0);

  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Lie-fi butter")).toHaveCount(1);
});

test("an add whose response is lost isn't duplicated when the queued copy syncs", async ({
  page,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Milk")).toBeVisible();

  // The POST reaches the server and is applied, but the response never
  // makes it back, so the client queues the same add offline.
  await page.route("**/lists/shopping.data*", async (route) => {
    if (route.request().method() === "POST") await route.fetch();
    await route.abort("internetdisconnected");
  });

  await page.getByLabel("New item").fill("Lost-response jam");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByLabel("Edit Lost-response jam")).toBeVisible();
  await expect.poll(() => queuedMutationCount(page)).toBeGreaterThan(0);

  await page.unroute("**/lists/shopping.data*");
  await expect.poll(() => queuedMutationCount(page), { timeout: 10000 }).toBe(0);

  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Lost-response jam")).toHaveCount(1);
});

test("multiple items added offline all sync to the server on reconnect", async ({
  page,
  ctx,
  context,
}) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Milk")).toBeVisible();

  await context.setOffline(true);
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();

  await page.getByLabel("New item").fill("Offline flour");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByLabel("Edit Offline flour")).toBeVisible({ timeout: 10000 });

  await page.getByLabel("New item").fill("Offline sugar");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByLabel("Edit Offline sugar")).toBeVisible({ timeout: 10000 });

  const syncSubmitted = page.waitForResponse(
    (response) =>
      response.url().includes("/lists/shopping.data") && response.request().method() === "POST",
  );

  await context.setOffline(false);

  await expect(page.getByText("Back online - syncing changes")).toBeVisible();
  await syncSubmitted;
  await expect(page.getByText("Offline", { exact: true })).not.toBeVisible();

  // Both offline additions must survive a full reload — i.e. both actually
  // reached the server, not just the most recent one. mutate_list previously
  // only ever inserted a single new row per resync request (see migration
  // 20260806000000), so before that fix only "Offline sugar" would persist.
  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Offline flour")).toBeVisible();
  await expect(page.getByLabel("Edit Offline sugar")).toBeVisible();
});

test.describe(() => {
  // The SW would forward the intercepted POST itself, delivering it twice
  // before the reload and muddying what this test isolates.
  test.use({ serviceWorkers: "block" });

  test("a reload while a sync is in flight doesn't duplicate offline additions", async ({
    page,
    ctx,
    context,
  }) => {
    await login(page, ctx.ownerEmail);
    await openList(page, "shopping");
    await expect(page.getByLabel("Edit Milk")).toBeVisible();

    await context.setOffline(true);
    await page.getByLabel("New item").fill("Offline butter");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByLabel("Edit Offline butter")).toBeVisible({ timeout: 10000 });

    // performRebaseSync only dequeues once the sync POST's response arrives.
    // Let the POST reach the server but never hand its response back, then
    // reload — as if the tab were reloaded or closed mid-request. The server
    // has applied the addition, but the queue survives into the next mount.
    let delivered!: () => void;
    const syncDelivered = new Promise<void>((resolve) => {
      delivered = resolve;
    });
    await page.route("**/lists/shopping.data*", async (route) => {
      if (route.request().method() !== "POST") return route.continue();
      await route.fetch();
      delivered();
    });

    await context.setOffline(false);
    await syncDelivered;
    await page.unroute("**/lists/shopping.data*");

    // The remount retries the still-queued edit, rebased onto fresh server
    // state that already contains the addition.
    await openList(page, "shopping");
    await expect.poll(() => queuedMutationCount(page)).toBe(0);

    await openList(page, "shopping");
    await expect(page.getByLabel("Edit Offline butter")).toHaveCount(1);
  });
});

test("a stale-session redirect mid-sync doesn't drop the queued edit, and it flushes once retried", async ({
  page,
  ctx,
  context,
}) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Milk")).toBeVisible();

  await context.setOffline(true);
  await page.getByLabel("New item").fill("Offline butter");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByLabel("Edit Offline butter")).toBeVisible({ timeout: 10000 });

  // The rebase-and-resubmit sync goes through RR's single-fetch protocol
  // (submit(), not a raw fetch), so a middleware redirect arrives encoded
  // as a 204 + X-Remix-Redirect/-Status headers, not a raw 3xx — see
  // fetchAndDecodeViaTurboStream in react-router's single-fetch client.
  // This is what supabaseMiddleware's redirect(href("/login")) actually
  // produces for a stale/unrefreshable session.
  let redirectedPostSeen = false;
  await page.route("**/lists/shopping.data", async (route) => {
    if (route.request().method() === "POST") {
      redirectedPostSeen = true;
      await route.fulfill({
        status: 204,
        headers: { "X-Remix-Redirect": "/login", "X-Remix-Status": "302" },
      });
      return;
    }
    await route.continue();
  });

  await context.setOffline(false);
  await expect(page.getByText("Back online - syncing changes")).toBeVisible();
  await expect.poll(() => redirectedPostSeen).toBe(true);
  // React Router follows the redirect as a normal completed navigation.
  await page.waitForURL("/login");

  await page.unroute("**/lists/shopping.data");

  // Log back in and return — no further online/offline transition occurs
  // here, so only the mount-time retry (not just onOnline) can pick the
  // still-queued edit back up.
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Offline butter")).toBeVisible({ timeout: 10000 });

  // Must survive a fresh reload — proves it actually reached the server
  // this time, not just optimistic local state.
  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Offline butter")).toBeVisible();
});

test("a concurrent addition from another device survives reconnect sync", async ({
  browser,
  ctx,
}, testInfo) => {
  // Two browser contexts, two logins, two offline round-trips — inherently
  // slower than most tests here, and has been observed to butt up against
  // the default per-test timeout under full-suite CI load, surfacing as a
  // misleading "Target page has been closed" once Playwright tears down
  // the contexts mid-test rather than a clear timeout error.
  testInfo.slow();

  const ownerContext = await browser.newContext({ baseURL });
  const collabContext = await browser.newContext({ baseURL });
  try {
    const ownerPage = await ownerContext.newPage();
    const collabPage = await collabContext.newPage();

    await login(ownerPage, ctx.ownerEmail);
    await login(collabPage, ctx.collabEmail);

    await openList(ownerPage, "shopping");

    await ownerContext.setOffline(true);
    await expect(ownerPage.getByText("Offline", { exact: true })).toBeVisible();

    // Owner deletes Milk while offline — a pure edit/delete, no addition, so
    // this isolates the concurrency behaviour from mutate_list's "only the
    // most recent offline addition survives" limitation (see the comment on
    // performRebaseSync in list.tsx). Generous timeouts throughout this test:
    // under full-suite load these client-side/animation-dependent steps have
    // been observed occasionally slow, consistent with resource contention
    // rather than a functional issue — reliable and near-instant in isolation.
    await ownerPage.getByRole("button", { name: "Delete Milk" }).click();
    await expect(ownerPage.getByLabel("Edit Milk")).not.toBeVisible({ timeout: 10000 });

    // Meanwhile, another device (online) adds an item to the same list.
    // Replaying the owner's stale full-array snapshot naively would make
    // mutate_list treat Margarine as "not in what I submitted" and
    // soft-delete it — this is exactly the bug rebaseListItems exists to
    // avoid.
    await openList(collabPage, "shopping");
    await collabPage.getByLabel("New item").fill("Margarine");
    await collabPage.getByRole("button", { name: "Add" }).click();
    await expect(collabPage.getByLabel("Edit Margarine")).toBeVisible({ timeout: 10000 });

    const syncSubmitted = ownerPage.waitForResponse(
      (response) =>
        response.url().includes("/lists/shopping.data") && response.request().method() === "POST",
    );

    await ownerContext.setOffline(false);
    await expect(ownerPage.getByText("Back online - syncing changes")).toBeVisible();
    await syncSubmitted;
    await expect(ownerPage.getByText("Offline", { exact: true })).not.toBeVisible();

    // Reload to confirm both changes actually reached the server: the
    // collaborator's concurrent addition survived, and the owner's own
    // offline deletion was applied.
    await openList(ownerPage, "shopping");
    await expect(ownerPage.getByLabel("Edit Margarine")).toBeVisible();
    await expect(ownerPage.getByLabel("Edit Milk")).not.toBeVisible();
  } finally {
    await ownerContext.close();
    await collabContext.close();
  }
});

test("a failed fresh-data fetch on reconnect never syncs against stale cached data", async ({
  browser,
  ctx,
}, testInfo) => {
  testInfo.slow();

  const ownerContext = await browser.newContext({ baseURL });
  const collabContext = await browser.newContext({ baseURL });
  try {
    const ownerPage = await ownerContext.newPage();
    const collabPage = await collabContext.newPage();

    await login(ownerPage, ctx.ownerEmail);
    await login(collabPage, ctx.collabEmail);

    await openList(ownerPage, "shopping");

    await ownerContext.setOffline(true);
    await expect(ownerPage.getByText("Offline", { exact: true })).toBeVisible();
    await ownerPage.getByRole("button", { name: "Delete Milk" }).click();
    await expect(ownerPage.getByLabel("Edit Milk")).not.toBeVisible({ timeout: 10000 });

    await openList(collabPage, "shopping");
    await collabPage.getByLabel("New item").fill("Margarine");
    await collabPage.getByRole("button", { name: "Add" }).click();
    await expect(collabPage.getByLabel("Edit Margarine")).toBeVisible({ timeout: 10000 });

    // Data fetches keep failing for a moment after reconnecting, as they can
    // while the connection settles, so the loader falls back to the cached
    // list that predates Margarine. Syncing against that would delete it.
    let failedFetches = 0;
    let failUntil = Number.POSITIVE_INFINITY;
    await ownerPage.route("**/lists/shopping.data*", async (route) => {
      if (route.request().method() === "GET" && Date.now() < failUntil) {
        failedFetches += 1;
        await route.abort("internetdisconnected");
        return;
      }
      await route.continue();
    });

    const syncSubmitted = ownerPage.waitForResponse(
      (response) =>
        response.url().includes("/lists/shopping.data") && response.request().method() === "POST",
    );
    failUntil = Date.now() + 1500;
    await ownerContext.setOffline(false);
    await syncSubmitted;
    expect(failedFetches).toBeGreaterThan(0);
    await ownerPage.unroute("**/lists/shopping.data*");

    await openList(ownerPage, "shopping");
    await expect(ownerPage.getByLabel("Edit Margarine")).toBeVisible();
    await expect(ownerPage.getByLabel("Edit Milk")).not.toBeVisible();
  } finally {
    await ownerContext.close();
    await collabContext.close();
  }
});

test("own changes do not trigger the updated-by-another-user notification", async ({
  browser,
  ctx,
}) => {
  const ownerContext = await browser.newContext({ baseURL });
  const collabContext = await browser.newContext({ baseURL });
  try {
    const ownerPage = await ownerContext.newPage();
    const collabPage = await collabContext.newPage();

    await login(ownerPage, ctx.ownerEmail);
    await login(collabPage, ctx.collabEmail);

    await openList(ownerPage, "shopping");
    await openList(collabPage, "shopping");

    await ownerPage.getByLabel("New item").fill("Margarine");
    await ownerPage.getByRole("button", { name: "Add" }).click();

    // Anchor timing on actual broadcast delivery: the collaborator sees it...
    await expect(collabPage.getByText("List updated by another user")).toBeVisible();
    // ...while the owner — whose clientId matches the broadcast — must not.
    await expect(ownerPage.getByText("List updated by another user")).not.toBeVisible();
  } finally {
    await ownerContext.close();
    await collabContext.close();
  }
});

test("item added by collaborator appears as unread for owner on home page", async ({
  browser,
  ctx,
}) => {
  const ownerContext = await browser.newContext({ baseURL });
  const collabContext = await browser.newContext({ baseURL });
  try {
    const ownerPage = await ownerContext.newPage();
    const collabPage = await collabContext.newPage();

    await login(ownerPage, ctx.ownerEmail);
    await login(collabPage, ctx.collabEmail);

    // Owner opens the list — records viewed_at covering all current items
    await openList(ownerPage, "shopping");
    await expect(ownerPage.getByLabel("Edit Milk")).toBeVisible();

    // Owner goes back home — no unread badge because viewed_at > all item timestamps
    await ownerPage.goto("/");
    await expect(ownerPage.getByText(/unread/)).not.toBeVisible();

    // Collab adds a new item to the same list
    await openList(collabPage, "shopping");
    await collabPage.getByLabel("New item").fill("Margarine");
    await collabPage.getByRole("button", { name: "Add" }).click();
    await expect(collabPage.getByLabel("Edit Margarine")).toBeVisible();

    // Owner refreshes home — the new item's updated_at is after owner's viewed_at
    await ownerPage.reload();
    await expect(ownerPage.getByText("1 unread")).toBeVisible();
  } finally {
    await ownerContext.close();
    await collabContext.close();
  }
});

test("new item is marked in the list since last opening", async ({ browser, ctx }) => {
  const ownerContext = await browser.newContext({ baseURL });
  const collabContext = await browser.newContext({ baseURL });
  try {
    const ownerPage = await ownerContext.newPage();
    const collabPage = await collabContext.newPage();

    await login(ownerPage, ctx.ownerEmail);
    await login(collabPage, ctx.collabEmail);

    await openList(ownerPage, "shopping");
    await expect(ownerPage.getByLabel("Edit Milk")).toBeVisible();

    await ownerPage.goto("/");
    await expect(ownerPage.getByText(/unread/)).not.toBeVisible();

    await openList(collabPage, "shopping");
    await collabPage.getByLabel("New item").fill("Margarine");
    await collabPage.getByRole("button", { name: "Add" }).click();
    await expect(collabPage.getByLabel("Edit Margarine")).toBeVisible();

    await openList(ownerPage, "shopping");
    await expect(
      ownerPage
        .locator('[data-new="true"]')
        .filter({ has: ownerPage.getByLabel("Edit Margarine") }),
    ).toHaveCount(1);
    await expect(
      ownerPage.locator('[data-new="true"]').filter({ has: ownerPage.getByLabel("Edit Milk") }),
    ).toHaveCount(0);
  } finally {
    await ownerContext.close();
    await collabContext.close();
  }
});

test("collab sees real-time update when owner adds an item", async ({ browser, ctx }) => {
  // Two isolated browser contexts simulate two separate users
  const ownerContext = await browser.newContext({ baseURL });
  const collabContext = await browser.newContext({ baseURL });
  try {
    const ownerPage = await ownerContext.newPage();
    const collabPage = await collabContext.newPage();

    await login(ownerPage, ctx.ownerEmail);
    await login(collabPage, ctx.collabEmail);

    // Both navigate to the owner's Shopping list (collab is a member)
    await openList(ownerPage, "shopping");
    await openList(collabPage, "shopping");

    // Owner adds a new item
    await ownerPage.getByLabel("New item").fill("Margarine");
    await ownerPage.getByRole("button", { name: "Add" }).click();

    // Collab should receive the broadcast and see the notification
    await expect(collabPage.getByText("List updated by another user")).toBeVisible();
    // And the new item should appear after revalidation
    await expect(collabPage.getByLabel("Edit Margarine")).toBeVisible();
  } finally {
    await ownerContext.close();
    await collabContext.close();
  }
});

test("reordering items does not create unread or new markers for self", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  let releaseReorderRequest = () => {};
  const reorderRequestBlocked = new Promise<void>((resolve) => {
    releaseReorderRequest = resolve;
  });

  await page.route("**/lists/shopping", async (route) => {
    if (route.request().method() === "POST") {
      await reorderRequestBlocked;
    }

    await route.continue();
  });

  // Open once to establish viewed_at for existing items.
  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Milk")).toBeVisible();

  // Go home and open again so no pre-existing items are marked new.
  await page.goto("/");
  await openList(page, "shopping");

  const getEditOrder = async () =>
    page
      .locator('button[aria-label^="Edit "]')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("aria-label") ?? "").filter(Boolean),
      );

  // Guard against the selector silently matching nothing again: each row has
  // an "Edit <value>" button. Poll so the clientLoader HydrateFallback (skeleton)
  // resolves before we assert the initial order.
  await expect
    .poll(getEditOrder)
    .toEqual([
      "Edit Milk",
      "Edit Bread",
      "Edit Eggs",
      "Edit Butter",
      "Edit Cheese",
      "Edit Bananas",
      "Edit Apples",
      "Edit Yogurt",
      "Edit Orange juice",
      "Edit Coffee",
    ]);

  // Drag-and-drop can be timing-sensitive in CI; retry a few times.
  let reordered = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    const fromHandle = page.getByLabel("Reorder Milk");
    const toHandle = page.getByLabel("Reorder Eggs");

    const fromBox = await fromHandle.boundingBox();
    const toBox = await toHandle.boundingBox();
    if (!fromBox || !toBox) {
      throw new Error("Unable to determine drag handle positions for reorder");
    }

    await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
    await page.mouse.down();
    await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2 + 20, {
      steps: 25,
    });
    await page.mouse.up();

    // Give the pointer-up reorder submit/revalidation a moment in CI.
    await page.waitForTimeout(200);

    const order = await getEditOrder();
    if (order[0] !== "Edit Milk") {
      reordered = true;
      break;
    }
  }

  expect(reordered).toBe(true);

  await expect.poll(async () => (await getEditOrder())[0], { timeout: 2000 }).not.toBe("Edit Milk");

  releaseReorderRequest();
  await page.unroute("**/lists/shopping");

  await page.goto("/");
  const shoppingRow = page
    .locator("li")
    .filter({ has: page.getByRole("link", { name: "Shopping", exact: true }) });
  await expect(shoppingRow.getByText(/unread/)).not.toBeVisible();

  await openList(page, "shopping");
  await expect(
    page.locator('[data-new="true"]').filter({ has: page.getByLabel("Edit Milk") }),
  ).toHaveCount(0);
});

test("list page matches its snapshot", { tag: "@visual" }, async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await page.goto(listPath("shopping"));
  await expectPageSnapshot(page, "list");
});
