import { test, expect } from "@playwright/test";
import { login, resetDb, createTestContext } from "./helpers";

const ctx = createTestContext();

test.beforeEach(async ({ page }) => {
  await resetDb(page, ctx);
});

test("owner can delete a list", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  // Open admin config for Owner Empty
  await page
    .locator("li")
    .filter({ has: page.getByRole("link", { name: "Owner Empty" }) })
    .getByRole("link", { name: "admin" })
    .click();

  await expect(page.getByRole("dialog")).toBeVisible();

  // Navigate to the delete confirmation page
  await page.getByRole("link", { name: "Delete list" }).click();

  await expect(page.getByRole("heading", { name: "Delete?" })).toBeVisible();
  await expect(page.getByText("Are you sure?")).toBeVisible();

  // Confirm deletion
  await page.getByRole("button", { name: "Yes" }).click();

  // Should redirect to home page after deletion
  await page.waitForURL("/");

  // Owner Empty should no longer be in the list
  await expect(
    page.getByRole("link", { name: "Owner Empty" }),
  ).not.toBeVisible();
});
