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

test("owner sees their two lists", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await expect(page.getByRole("link", { name: "Shopping" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Owner Empty" })).toBeVisible();
});

test("owner can reorder lists from home", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  const mockPort = process.env.MOCK_SERVER_PORT ?? "9001";
  const state = await page.request
    .get(`http://localhost:${mockPort}/test/state?ownerEmail=${encodeURIComponent(ctx.ownerEmail)}`)
    .then((response) => response.json());
  const ownerEmpty = state.owner.lists.find(
    (list: { slug: string }) => list.slug === "owner-empty",
  );
  const shopping = state.owner.lists.find((list: { slug: string }) => list.slug === "shopping");

  if (!ownerEmpty || !shopping) {
    throw new Error("Unable to load owner list ids for home reorder test");
  }

  const getListOrder = async () =>
    page
      .locator('li a[href^="/lists/"]')
      .evaluateAll((elements) =>
        elements.map((element) => element.textContent?.trim() ?? "").filter(Boolean),
      );

  await page.evaluate(
    async ([ownerEmptyId, shoppingId]) => {
      const formData = new FormData();
      formData.set("intent", "reorder-lists");
      formData.append("list-order", ownerEmptyId);
      formData.append("list-order", shoppingId);

      await fetch("/", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
    },
    [ownerEmpty.id, shopping.id],
  );

  await page.reload();
  const persistedOrder = await getListOrder();
  expect(persistedOrder[0]).toBe("Owner Empty");
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

  // Shopping has 3 seeded items and has never been opened — all 3 are unread
  await expect(page.getByText("3 unread")).toBeVisible();
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
  await expect(page.getByText("3 unread")).toBeVisible();

  // Open the list — loader upserts a list_view
  await page.getByRole("link", { name: "Shopping" }).click();
  await page.waitForURL("/lists/shopping");

  // Navigate back to home
  await page.getByRole("link", { name: "Back to index" }).click();
  await page.waitForURL("/");

  // Badge should be gone — viewed_at is now newer than all item timestamps
  await expect(page.getByText("3 unread")).not.toBeVisible();
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

  await expect(page.getByText("3 unread")).not.toBeVisible();

  await login(page, ctx.collabEmail);
  const shoppingRow = page
    .locator("li")
    .filter({ has: page.getByRole("link", { name: "Shopping", exact: true }) });
  await expect(shoppingRow.getByText("3 unread")).toBeVisible();
});
