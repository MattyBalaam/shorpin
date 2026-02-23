import { test, expect } from "./fixtures";
import { login } from "./helpers";

const baseURL = `http://localhost:${process.env.APP_SERVER_PORT ?? "5174"}`;

test("list with items shows all items", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: "Shopping" }).click();

  await expect(page.getByLabel("Edit Milk")).toBeVisible();
  await expect(page.getByLabel("Edit Bread")).toBeVisible();
  await expect(page.getByLabel("Edit Eggs")).toBeVisible();
});

test("empty list shows no items", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: "Owner Empty" }).click();

  // The only textbox on an empty list is the "add new item" input
  await expect(page.getByRole("textbox")).toHaveCount(1);
});

test("empty list shows a placeholder prompt", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: "Owner Empty" }).click();

  await expect(page.getByText("No items yet — add one below")).toBeVisible();
});

test("owner can add an item to a list", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: "Owner Empty" }).click();
  await page.waitForURL("/lists/owner-empty");

  await page.getByLabel("New item").fill("Butter");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByRole("textbox").first()).toHaveValue("Butter");
});

test("owner can delete an item from a list", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: "Shopping" }).click();

  await page.getByRole("button", { name: "Delete Milk" }).click();

  await expect(page.getByLabel("Edit Milk")).not.toBeVisible();

  // An undo button should appear
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
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
    await ownerPage.goto("/lists/shopping");
    await collabPage.goto("/lists/shopping");

    // Owner adds a new item
    await ownerPage.getByLabel("New item").fill("Butter");
    await ownerPage.getByRole("button", { name: "Add" }).click();

    // Collab should receive the broadcast and see the notification
    await expect(collabPage.getByText("List updated by another user")).toBeVisible();
    // And the new item should appear after revalidation
    await expect(collabPage.getByLabel("Edit Butter")).toBeVisible();
  } finally {
    await ownerContext.close();
    await collabContext.close();
  }
});
