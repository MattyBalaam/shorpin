import { test, expect } from "@playwright/test";
import { login, resetDb, createTestContext } from "./helpers";

const ctx = createTestContext();

test.beforeEach(async ({ page }) => {
  await resetDb(page, ctx);
});

test("list with items shows all items", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: "Shopping" }).click();

  await expect(page.getByLabel("Edit Milk")).toBeVisible();
  await expect(page.getByLabel("Edit Bread")).toBeVisible();
  await expect(page.getByLabel("Edit Eggs")).toBeVisible();
});

test("empty list shows no items", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: "Owner Empty" }).click();

  // The only textbox on an empty list is the "add new item" input
  await expect(page.getByRole("textbox")).toHaveCount(1);
});

test("empty list shows a placeholder prompt", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: "Owner Empty" }).click();

  await expect(page.getByText("No items yet — add one below")).toBeVisible();
});

test("owner can add an item to a list", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: "Owner Empty" }).click();
  await page.waitForURL("/lists/owner-empty");

  await page.getByLabel("New item").fill("Butter");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(page.getByRole("textbox").first()).toHaveValue("Butter");
});

test("owner can delete an item from a list", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: "Shopping" }).click();

  await page.getByRole("button", { name: "Delete Milk" }).click();

  await expect(page.getByLabel("Edit Milk")).not.toBeVisible();

  // An undo button should appear
  await expect(page.getByRole("button", { name: "Undo" })).toBeVisible();
});
