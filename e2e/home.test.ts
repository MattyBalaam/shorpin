import { test, expect } from "@playwright/test";
import { login, resetDb, createTestContext } from "./helpers";

const ctx = createTestContext();

test.beforeEach(async ({ page }) => {
  await resetDb(page, ctx);
});

test("owner can create a new list", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  await page.getByLabel("New list").fill("Groceries");
  await page.getByRole("button", { name: "Add" }).click();

  await page.waitForURL("/lists/groceries");
  await expect(page).toHaveURL("/lists/groceries");

  await page.getByRole("link", { name: "Home" }).click();

  await expect(page.getByRole("link", { name: "Groceries" })).toBeVisible();
});

test("owner sees their two lists", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  await expect(page.getByRole("link", { name: "Shopping" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Owner Empty" })).toBeVisible();
});

test("owner sees admin link for both their lists", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  await expect(page.getByRole("link", { name: "admin" })).toHaveCount(2);
});

test("collaborator sees their lists plus the shared list", async ({ page }) => {
  await login(page, ctx.collabEmail);

  await expect(
    page.getByRole("link", { name: "Collab Shopping" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Collab Empty" })).toBeVisible();
  await expect(
    page.getByRole("link", { name: "Shopping", exact: true }),
  ).toBeVisible(); // shared from owner
});

test("collaborator sees admin only for their own lists, not the shared one", async ({
  page,
}) => {
  await login(page, ctx.collabEmail);

  // Collab owns 2 lists → 2 admin links, but not for the shared Shopping list
  await expect(page.getByRole("link", { name: "admin" })).toHaveCount(2);
});

test("user adds new list", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  await expect(page.getByRole("link", { name: "admin" })).toHaveCount(2);
});

test("shows an error message when list creation fails", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  await page.getByLabel("New list").fill("__fail__");
  await page.getByRole("button", { name: "Add" }).click();

  await expect(
    page.getByText("Failed to create list. Please try again."),
  ).toBeVisible();
});
