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
    // Shopping has 3 seeded items and has never been opened — all 3 are unread
    await expect(page.getByText("3 unread")).toBeVisible();
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
