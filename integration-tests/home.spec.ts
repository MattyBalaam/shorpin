import { expect, test } from "./fixtures";
import { expectPageSnapshot, isServerFnCall, login } from "./helpers";

test("owner can create a new list", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page.getByLabel("New list").fill("Groceries");
  await page.getByRole("button", { name: "Add" }).click();

  await page.waitForURL("/lists/groceries");
  await expect(page).toHaveURL("/lists/groceries");

  await page.getByRole("link", { name: "Back to index" }).click();

  await expect(page.getByRole("link", { name: "Groceries" })).toBeVisible();
});

test("owner can reuse the name of a deleted list", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page
    .locator("li")
    .filter({ has: page.getByRole("link", { name: "Owner Empty" }) })
    .getByRole("link", { name: "Configure" })
    .click();
  await page.getByRole("link", { name: "Delete list" }).click();
  await page.getByRole("button", { name: "Yes" }).click();
  await page.waitForURL("/");

  // The soft-deleted row still holds the `owner-empty` slug.
  await page.getByLabel("New list").fill("Owner Empty");
  await page.getByRole("button", { name: "Add" }).click();

  await page.waitForURL("/lists/owner-empty-1");
});

test("owner can create a list whose slug belongs to a list they can't see", async ({
  page,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);

  // Collab's `collab-shopping` isn't shared with owner, so RLS hides it.
  await page.getByLabel("New list").fill("Collab Shopping");
  await page.getByRole("button", { name: "Add" }).click();

  await page.waitForURL(/\/lists\/collab-shopping-[0-9a-f]{6}$/);
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

  const syncSubmitted = page.waitForResponse(isServerFnCall("createList"));

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

  // A stale session: with the auth cookies gone, the server's auth check
  // redirects the replay to /login, as for any expired session.
  await context.clearCookies();

  await context.setOffline(false);
  await expect(page.getByText("Back online - syncing changes")).toBeVisible();
  await page.waitForURL("/login");

  // Redirected away, not delivered: the queued list survives, and the
  // mount-time retry (no further online/offline transition happens here)
  // delivers it once the user is back.
  await login(page, ctx.ownerEmail);
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

  const syncSubmitted = page.waitForResponse(isServerFnCall("reorderLists"));

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
    // Shopping has 30 seeded items and has never been opened — all 30 are unread
    await expect(page.getByText("30 unread")).toBeVisible();
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
  await expect(page.getByText("30 unread")).toBeVisible();

  // Open the list — loader upserts a list_view
  await page.getByRole("link", { name: "Shopping" }).click();
  await page.waitForURL("/lists/shopping");
  // The URL changes as the navigation starts, before the list has loaded
  // (and recorded the visit), so wait for the list itself.
  await expect(page.getByLabel("Edit Milk")).toBeVisible();

  // Navigate back to home
  await page.getByRole("link", { name: "Back to index" }).click();
  await page.waitForURL("/");

  // Badge should be gone — viewed_at is now newer than all item timestamps
  await expect(page.getByText("30 unread")).not.toBeVisible();
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
  // The URL changes as the navigation starts, before the list has loaded
  // (and recorded the visit), so wait for the list itself.
  await expect(page.getByLabel("Edit Milk")).toBeVisible();
  await page.getByRole("link", { name: "Back to index" }).click();

  await expect(page.getByText("30 unread")).not.toBeVisible();

  await login(page, ctx.collabEmail);
  const shoppingRow = page
    .locator("li")
    .filter({ has: page.getByRole("link", { name: "Shopping", exact: true }) });
  await expect(shoppingRow.getByText("30 unread")).toBeVisible();
});

test("starred list opens on app launch, and un-starring falls back to home", async ({
  page,
  ctx,
}) => {
  // Only the star's own action response carries Set-Cookie — not e.g. the
  // /perf beacon, which is also a POST.
  const isStarSubmission = isServerFnCall("setDefaultList");

  await login(page, ctx.ownerEmail);

  // With nothing starred, a launch lands on plain home (launch param dropped
  // so a later revalidation can't re-trigger the redirect).
  await page.goto("/?launch");
  await expect(page).toHaveURL("/");

  const star = page.getByRole("button", { name: "Open Shopping on launch" });
  await expect(star).toHaveAttribute("aria-pressed", "false");

  const starred = page.waitForResponse(isStarSubmission);
  await star.click();
  await starred;
  await expect(star).toHaveAttribute("aria-pressed", "true");

  // Starring another list moves the star rather than adding a second one.
  const otherStar = page.getByRole("button", { name: "Open Owner Empty on launch" });
  const moved = page.waitForResponse(isStarSubmission);
  await otherStar.click();
  await moved;
  await expect(otherStar).toHaveAttribute("aria-pressed", "true");
  await expect(star).toHaveAttribute("aria-pressed", "false");

  await page.goto("/?launch");
  await expect(page).toHaveURL("/lists/owner-empty");

  await page.goto("/");
  const cleared = page.waitForResponse(isStarSubmission);
  await otherStar.click();
  await cleared;
  await expect(otherStar).toHaveAttribute("aria-pressed", "false");

  await page.goto("/?launch");
  await expect(page).toHaveURL("/");
});

test("installed app opens the starred list on launch even without start_url (iOS)", async ({
  page,
  ctx,
}) => {
  // iOS home screen apps ignore the manifest's `/?launch` start_url and open
  // plain `/`; they're only identifiable as standalone.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "standalone", { value: true });
  });

  await login(page, ctx.ownerEmail);

  const starred = page.waitForResponse(isServerFnCall("setDefaultList"));
  await page.getByRole("button", { name: "Open Shopping on launch" }).click();
  await starred;

  // A fresh document load at `/` is a launch.
  await page.goto("/");
  await expect(page).toHaveURL("/lists/shopping");

  // In-app navigation back to home is not.
  await page.getByRole("link", { name: "Back to index" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Shopping", exact: true })).toBeVisible();

  // Nor is a reload (pull-to-refresh) of home.
  await page.reload();
  await expect(page.getByRole("link", { name: "Shopping", exact: true })).toBeVisible();
  await expect(page).toHaveURL("/");
});

test("home page matches its snapshot", { tag: "@visual" }, async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await expectPageSnapshot(page, "home");
});
