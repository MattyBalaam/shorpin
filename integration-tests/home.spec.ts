import { expect, test } from "./fixtures";
import { login } from "./helpers";

test("owner can create a new list", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page.getByLabel("New list").fill("Groceries");
  await page.getByRole("button", { name: "Add" }).click();

  await page.waitForURL("/lists/groceries");
  await expect(page).toHaveURL("/lists/groceries");

  await page.getByRole("link", { name: "Back to index" }).click();

  await expect(page.getByRole("link", { name: "Groceries" })).toBeVisible();
});

test("owner can create a list while offline, synced on reconnect", async ({
  page,
  ctx,
  context,
}) => {
  await login(page, ctx.ownerEmail);

  await context.setOffline(true);
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();

  await page.getByLabel("New list").fill("Camping");
  await page.getByRole("button", { name: "Add" }).click();

  // Offline creation can't redirect into the new list — there's no
  // server-confirmed slug yet — so it stays on `/` showing a non-navigable
  // pending row instead. Generous timeout: under full-suite load this step
  // (client-side only, no network) has been observed occasionally slow,
  // consistent with resource contention rather than a functional issue —
  // it's instant and 100% reliable in isolation.
  await expect(page.getByText("Camping (pending", { exact: false })).toBeVisible({
    timeout: 10000,
  });
  await expect(page.getByRole("link", { name: "Camping" })).toHaveCount(0);

  const syncSubmitted = page.waitForResponse(
    // The offline-queued replay is a raw fetch to the plain route path
    // (entry.route, captured from clientAction's request.url — RR's own
    // .data protocol is only used for JS-driven submissions that reach
    // serverAction(), not for the logical request clientAction sees), so
    // match on path rather than a .data suffix.
    (response) =>
      new URL(response.url()).pathname === "/" && response.request().method() === "POST",
  );

  await context.setOffline(false);
  await expect(page.getByText("Back online - syncing changes")).toBeVisible();
  await syncSubmitted;
  await expect(page.getByText("Offline", { exact: true })).not.toBeVisible();

  // The pending row is replaced by the real, navigable list once the
  // post-sync revalidate() lands — checked without reloading, since a
  // reload can race and abort that still-in-flight revalidate/cache-write
  // (the JS context survives here, so it always gets to finish).
  await expect(page.getByRole("link", { name: "Camping" })).toBeVisible({ timeout: 10000 });
});

test("a stale-session redirect during reconnect sync doesn't drop a queued list, and it flushes once retried", async ({
  page,
  ctx,
  context,
}) => {
  await login(page, ctx.ownerEmail);

  await context.setOffline(true);
  await page.getByLabel("New list").fill("Camping");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByText("Camping (pending", { exact: false })).toBeVisible({
    timeout: 10000,
  });

  // Home's replay is a raw fetch() to the plain route (see the previous
  // test's comment on entry.route), not RR's .data protocol, so the real
  // middleware redirect for a stale session comes back as a genuine 302
  // with a Location header — fetch() would silently follow that and
  // resolve "successfully" against /login without isSuccessfulReplay's
  // redirect: "manual" check (app/lib/mutation-replay.ts).
  let redirectedPostSeen = false;
  const isRootPath = (url: URL) => url.pathname === "/";
  const redirectToLogin: Parameters<typeof page.route>[1] = async (route) => {
    if (route.request().method() === "POST") {
      redirectedPostSeen = true;
      await route.fulfill({ status: 302, headers: { location: "/login" } });
      return;
    }
    await route.continue();
  };
  await page.route(isRootPath, redirectToLogin);

  await context.setOffline(false);
  await expect(page.getByText("Back online - syncing changes")).toBeVisible();
  await expect.poll(() => redirectedPostSeen).toBe(true);

  // Redirected-away, not delivered: the pending row must survive rather
  // than silently vanishing or falsely resolving into a real list link.
  // fetch() following a redirect never navigates the page itself, so this
  // assertion (unlike list.tsx's) needs no waitForURL.
  await expect(page.getByText("Camping (pending", { exact: false })).toBeVisible();
  await expect(page.getByRole("link", { name: "Camping" })).toHaveCount(0);

  await page.unroute(isRootPath, redirectToLogin);

  // No further online/offline transition occurs here — only the mount-time
  // retry (not just onOnline) can pick this queued entry back up.
  await page.reload();
  await expect(page.getByRole("link", { name: "Camping" })).toBeVisible({ timeout: 10000 });
});

test("owner sees their two lists", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await expect(page.getByRole("link", { name: "Shopping" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Owner Empty" })).toBeVisible();
});

test("owner can reorder lists from home", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  const getListOrder = async () =>
    page.locator('li a[href^="/lists/"]').evaluateAll((elements) => {
      console.log(elements);

      return elements.map((element) => element.textContent?.trim() ?? "").filter(Boolean);
    });

  // let reordered = false;
  // for (let attempt = 0; attempt < 3; attempt++) {
  const fromHandle = page.getByLabel("Reorder Owner Empty");
  const toHandle = page.getByLabel("Reorder Shopping");

  const fromBox = await fromHandle.boundingBox();
  const toBox = await toHandle.boundingBox();
  if (!fromBox || !toBox) {
    throw new Error("Unable to determine drag handle positions for home reorder");
  }

  await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2 - 20, {
    steps: 25,
  });
  await page.mouse.up();

  await page.waitForTimeout(200);

  await expect(async () => {
    expect(await getListOrder()).toEqual(["Owner Empty", "Shopping"]);
  }).toPass();

  await page.reload();

  await expect(async () => {
    expect(await getListOrder()).toEqual(["Owner Empty", "Shopping"]);
  }).toPass();
});

test("owner can reorder lists while offline, synced on reconnect", async ({
  page,
  ctx,
  context,
}) => {
  await login(page, ctx.ownerEmail);

  const getListOrder = async () =>
    page
      .locator('li a[href^="/lists/"]')
      .evaluateAll((elements) =>
        elements.map((element) => element.textContent?.trim() ?? "").filter(Boolean),
      );

  await context.setOffline(true);
  await expect(page.getByText("Offline", { exact: true })).toBeVisible();

  const fromHandle = page.getByLabel("Reorder Owner Empty");
  const toHandle = page.getByLabel("Reorder Shopping");
  const fromBox = await fromHandle.boundingBox();
  const toBox = await toHandle.boundingBox();
  if (!fromBox || !toBox) {
    throw new Error("Unable to determine drag handle positions for home reorder");
  }

  await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2 - 20, {
    steps: 25,
  });
  await page.mouse.up();

  await expect(async () => {
    expect(await getListOrder()).toEqual(["Owner Empty", "Shopping"]);
  }).toPass();

  // The visual order updates live during the drag, but onReorderComplete's
  // actual submit is deferred a frame past drop settling — give it a moment
  // to fire (and land in the offline queue) before reconnecting, or it may
  // fire late, after setOffline(false), and go out as a normal online
  // request instead of exercising the offline path (matches the timing
  // margin the non-offline reorder test above already waits out).
  await page.waitForTimeout(200);

  const syncSubmitted = page.waitForResponse(
    // The offline-queued replay is a raw fetch to the plain route path
    // (entry.route, captured from clientAction's request.url — RR's own
    // .data protocol is only used for JS-driven submissions that reach
    // serverAction(), not for the logical request clientAction sees), so
    // match on path rather than a .data suffix.
    (response) =>
      new URL(response.url()).pathname === "/" && response.request().method() === "POST",
  );

  await context.setOffline(false);
  await expect(page.getByText("Back online - syncing changes")).toBeVisible();
  await syncSubmitted;
  await expect(page.getByText("Offline", { exact: true })).not.toBeVisible();

  await page.reload();
  await expect(async () => {
    expect(await getListOrder()).toEqual(["Owner Empty", "Shopping"]);
  }).toPass();
});

test("reordering does not snap back immediately after drop", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  const firstList = () => page.locator('li a[href^="/lists/"]').first();

  const fromHandle = page.getByLabel("Reorder Owner Empty");
  const toHandle = page.getByLabel("Reorder Shopping");

  const fromBox = await fromHandle.boundingBox();
  const toBox = await toHandle.boundingBox();
  if (!fromBox || !toBox) {
    throw new Error("Unable to determine drag handle positions");
  }

  await page.mouse.move(fromBox.x + fromBox.width / 2, fromBox.y + fromBox.height / 2);
  await page.mouse.down();
  await page.mouse.move(toBox.x + toBox.width / 2, toBox.y + toBox.height / 2 - 20, {
    steps: 25,
  });
  await page.mouse.up();

  await expect(firstList()).toHaveText("Owner Empty");
});

test("owner sees admin link for both their lists", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await expect(page.getByRole("link", { name: "Configure" })).toHaveCount(2);
});

test("collaborator sees their lists plus the shared list", async ({ page, ctx }) => {
  await login(page, ctx.collabEmail);

  await expect(page.getByRole("link", { name: "Collab Shopping" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Collab Empty" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Shopping", exact: true })).toBeVisible(); // shared from owner
});

test("collaborator sees admin only for their own lists, not the shared one", async ({
  page,
  ctx,
}) => {
  await login(page, ctx.collabEmail);

  // Collab owns 2 lists → 2 admin links, but not for the shared Shopping list
  await expect(page.getByRole("link", { name: "Configure" })).toHaveCount(2);
});

test("user adds new list", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await expect(page.getByRole("link", { name: "Configure" })).toHaveCount(2);
});

test("shows an error message when list creation fails", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page.getByLabel("New list").fill("__fail__");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByText("Failed to create list. Please try again.")).toBeVisible();
});

test("shows unread badge for lists not yet opened", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await expect(async () => {
    // Shopping has 10 seeded items and has never been opened — all 10 are unread
    await expect(page.getByText("10 unread")).toBeVisible();
  }).toPass();
});

test("empty list shows no unread badge", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  // Owner Empty has no items so no badge
  const emptyRow = page
    .locator("li")
    .filter({ has: page.getByRole("link", { name: "Owner Empty" }) });
  await expect(emptyRow.getByText(/unread/)).not.toBeVisible();
});

test("unread badge clears after opening the list", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  // Badge visible before opening
  await expect(page.getByText("10 unread")).toBeVisible();

  // Open the list — loader upserts a list_view
  await page.getByRole("link", { name: "Shopping" }).click();
  await page.waitForURL("/lists/shopping");

  // Navigate back to home
  await page.getByRole("link", { name: "Back to index" }).click();
  await page.waitForURL("/");

  // Badge should be gone — viewed_at is now newer than all item timestamps
  await expect(page.getByText("10 unread")).not.toBeVisible();
});

test("collaborator sees unread badge for shared list not yet opened", async ({ page, ctx }) => {
  await login(page, ctx.collabEmail);

  // Shopping is shared with collab and collab has never opened it
  const shoppingRow = page
    .locator("li")
    .filter({ has: page.getByRole("link", { name: "Shopping", exact: true }) });
  await expect(shoppingRow.getByText(/unread/)).toBeVisible();
});

test("unread count is scoped to user - user A's views don't affect user B", async ({
  page,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: "Shopping" }).click();
  await page.waitForURL("/lists/shopping");
  await page.getByRole("link", { name: "Back to index" }).click();

  await expect(page.getByText("10 unread")).not.toBeVisible();

  await login(page, ctx.collabEmail);
  const shoppingRow = page
    .locator("li")
    .filter({ has: page.getByRole("link", { name: "Shopping", exact: true }) });
  await expect(shoppingRow.getByText("10 unread")).toBeVisible();
});
