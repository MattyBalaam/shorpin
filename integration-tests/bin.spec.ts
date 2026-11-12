import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { login } from "./helpers";

async function openList(page: Page, slug: string) {
  const path = `/lists/${slug}`;
  await page.goto(path);
  await expect(page.locator(`html[data-hydrated-path="${path}"]`)).toBeAttached();
}

function listSaved(page: Page, slug: string) {
  return page.waitForResponse(
    (response) =>
      response.url().includes(`/lists/${slug}.data`) && response.request().method() === "POST",
  );
}

/** Deletes an item and waits for the save and the reload after it. */
async function deleteItem(page: Page, name: string) {
  const saved = listSaved(page, "shopping");
  const reloaded = page.waitForResponse(
    (response) =>
      response.url().includes("/lists/shopping.data") && response.request().method() === "GET",
  );
  await page.getByRole("button", { name: `Delete ${name}` }).click();
  await saved;
  await reloaded;
}

async function openBin(page: Page) {
  await page.getByRole("link", { name: "Bin" }).click();
  const bin = page.getByRole("dialog", { name: "Bin" });
  await expect(bin).toBeVisible();
  return bin;
}

test("the bin lists deleted items newest first, and undeleting puts one back", async ({
  page,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  await deleteItem(page, "Milk");
  // A fresh page for the second delete: a click that lands between the
  // first save's reload arriving and its re-render removes by a stale index.
  await openList(page, "shopping");
  await deleteItem(page, "Bread");

  let bin = await openBin(page);
  await expect(page).toHaveURL("/lists/shopping/bin");
  await expect(bin.getByRole("button", { name: /^Undelete/ })).toHaveText([
    "Undelete Bread",
    "Undelete Milk",
  ]);

  // Saved through the list form, which goes back to the list.
  const saved = listSaved(page, "shopping");
  await bin.getByRole("button", { name: "Undelete Milk" }).click();
  await saved;
  await expect(page).toHaveURL("/lists/shopping");
  await expect(page.getByLabel("Edit Milk")).toBeVisible();

  // Back on the list, so no longer in the bin.
  bin = await openBin(page);
  await expect(bin.getByRole("button", { name: /^Undelete/ })).toHaveText(["Undelete Bread"]);

  // Persisted.
  await page.reload();
  await expect(bin.getByRole("button", { name: /^Undelete/ })).toHaveText(["Undelete Bread"]);
  await bin.getByRole("button", { name: "Close" }).click();
  await expect(page).toHaveURL("/lists/shopping");
  await expect(page.getByLabel("Edit Milk")).toBeVisible();
});

test("a list with nothing deleted has an empty bin", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "owner-empty");

  const bin = await openBin(page);
  await expect(bin.getByText("Nothing in the bin")).toBeVisible();
});

test("a collaborator sees and can undelete the owner's deleted items", async ({
  browser,
  page,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");
  await deleteItem(page, "Eggs");

  const collabContext = await browser.newContext({ baseURL: new URL(page.url()).origin });
  try {
    const collabPage = await collabContext.newPage();
    await login(collabPage, ctx.collabEmail);
    await openList(collabPage, "shopping");

    const bin = await openBin(collabPage);
    await bin.getByRole("button", { name: "Undelete Eggs" }).click();
    await expect(collabPage.getByLabel("Edit Eggs")).toBeVisible();

    // The owner's tab hears about it like any other member's change.
    await expect(page.getByLabel("Edit Eggs")).toBeVisible();
  } finally {
    await collabContext.close();
  }
});
