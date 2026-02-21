import { test, expect } from "@playwright/test";
import { login, resetDb, createTestContext } from "./helpers";

const ctx = createTestContext();

test.beforeEach(async ({ page }) => {
  await resetDb(page, ctx);
});

test("admin sees pending sign-ups count on home page", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  // The seed adds 1 waitlist entry, so the home page should show "1 pending"
  await expect(page.getByRole("link", { name: /pending/ })).toBeVisible();
});

test("admin can view sign-ups modal", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: /pending/ }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pending sign-ups" })).toBeVisible();
  await expect(page.getByText(ctx.waitlistEmail)).toBeVisible();
});

test("admin can handle sign-ups", async ({ page }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: /pending/ }).click();

  await expect(page.getByRole("dialog")).toBeVisible();

  // Check this worker's pending sign-up entry by its unique email
  await page.getByLabel(new RegExp(ctx.waitlistEmail)).check();
  await page.getByRole("button", { name: "Mark as handled" }).click();

  // Should redirect back to home with no pending sign-ups
  await page.waitForURL("/");
  await expect(page.getByRole("link", { name: /pending/ })).not.toBeVisible();
});
