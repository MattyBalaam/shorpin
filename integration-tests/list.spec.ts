import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { holdLoader, login } from "./helpers";

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

test("edited icon does not appear on unedited items while another item is being deleted", async ({
  page,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  // Edit Milk without submitting, giving it edited=true
  await page.getByLabel("Edit Milk").fill("Oat Milk");

  // Hold the revalidation loader so the navigation stays in "loading" state
  // long enough to assert — this is when navigation.formData becomes null and
  // isSavingEdit incorrectly flips true for all edited items.
  const { intercepted, release } = await holdLoader(page, /\/lists\/shopping\.data/);

  // Delete a different item
  await page.getByRole("button", { name: "Delete Bread" }).click();

  // Wait until the GET revalidation is actually intercepted before asserting
  await intercepted;

  // While in "loading" state no saving indicator should appear — we are not
  // persisting any edit, we are only deleting Bread
  await expect(
    page.locator("li").filter({ has: page.getByLabel("Edit Oat Milk") }),
  ).not.toContainText("saving");

  release();
  await expect(page.getByRole("button", { name: "Recreate last deleted" })).toBeVisible();

  // The delete form submission also saves all current item values (including
  // "Oat Milk"), so at idle there is no pending unsaved edit — the edited
  // indicator should not appear for any item.
  await expect(
    page.locator("li").filter({ has: page.getByLabel("Edit Oat Milk") }),
  ).not.toContainText(" edited");
  await expect(page.locator("li").filter({ has: page.getByLabel("Edit Eggs") })).not.toContainText(
    " edited",
  );
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

  // Add while offline — the clientAction stores it locally
  await page.getByLabel("New item").fill("Offline butter");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByLabel("Edit Offline butter")).toBeVisible();

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

test("a concurrent addition from another device survives reconnect sync", async ({
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

    await ownerContext.setOffline(true);
    await expect(ownerPage.getByText("Offline", { exact: true })).toBeVisible();

    // Owner deletes Milk while offline — a pure edit/delete, no addition, so
    // this isolates the concurrency behaviour from mutate_list's "only the
    // most recent offline addition survives" limitation (see the comment on
    // performRebaseSync in list.tsx).
    await ownerPage.getByRole("button", { name: "Delete Milk" }).click();
    await expect(ownerPage.getByLabel("Edit Milk")).not.toBeVisible();

    // Meanwhile, another device (online) adds an item to the same list.
    // Replaying the owner's stale full-array snapshot naively would make
    // mutate_list treat Margarine as "not in what I submitted" and
    // soft-delete it — this is exactly the bug rebaseListItems exists to
    // avoid.
    await openList(collabPage, "shopping");
    await collabPage.getByLabel("New item").fill("Margarine");
    await collabPage.getByRole("button", { name: "Add" }).click();
    await expect(collabPage.getByLabel("Edit Margarine")).toBeVisible();

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
      .locator('textarea[aria-label^="Edit "]')
      .evaluateAll((elements) =>
        elements.map((element) => element.getAttribute("aria-label") ?? "").filter(Boolean),
      );

  // Guard against the selector silently matching nothing again: the value
  // fields are <textarea>. Poll so the clientLoader HydrateFallback (skeleton)
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
