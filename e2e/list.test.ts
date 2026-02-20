import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("list with items shows all items", async ({ page }) => {
  await login(page, "owner@test.com");

  await page.getByRole("link", { name: "Shopping" }).click();

  await expect(page.locator('input[value="Milk"]')).toBeVisible();
  await expect(page.locator('input[value="Bread"]')).toBeVisible();
  await expect(page.locator('input[value="Eggs"]')).toBeVisible();
});

test("empty list shows no items", async ({ page }) => {
  await login(page, "owner@test.com");

  await page.getByRole("link", { name: "Owner Empty" }).click();

  await expect(page.getByRole("textbox")).toHaveCount(0);
});
