import { test, expect } from "@playwright/test";
import { login, resetDb, createTestContext } from "./helpers";

const ctx = createTestContext();

test.beforeEach(async ({ page }) => {
  await resetDb(page, ctx);
});

test("user can sign out", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("button", { name: "Sign out" }).click();

  await page.waitForURL("/login");
  await expect(page).toHaveURL("/login");
});
