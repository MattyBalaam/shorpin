import type { Page } from "@playwright/test";
import { test, expect } from "./fixtures";
import { expectPageSnapshot, login } from "./helpers";

test("admin sees pending sign-ups count on home page", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  // The seed adds 1 waitlist entry, so the home page should show "1 pending"
  await expect(page.getByRole("link", { name: /pending/ })).toBeVisible();
});

test("admin can view sign-ups modal", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: /pending/ }).click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pending sign-ups" })).toBeVisible();
  await expect(page.getByText(ctx.waitlistEmail)).toBeVisible();
});

test("admin can handle sign-ups", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: /pending/ }).click();

  await expect(page.getByRole("dialog")).toBeVisible();

  // Check this worker's pending sign-up entry by its unique email
  await page.getByLabel(new RegExp(ctx.waitlistEmail)).check();
  await page.getByRole("button", { name: "Mark as handled" }).click();

  await page.waitForURL("/");

  // The mock scopes the waitlist to this test's users, so with its only
  // entry handled the count badge goes away.
  await expect(page.getByRole("link", { name: /pending/ })).toBeHidden();
});

/**
 * Waits until the service worker controls the page, so navigations go
 * through it (a first visit installs it; claim() takes the page over).
 */
async function waitForServiceWorker(page: Page) {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) =>
        navigator.serviceWorker.addEventListener("controllerchange", resolve, { once: true }),
      );
    }
  });
}

// Pages without an offline copy of their own (only home and lists are
// cached) fall back to the service worker's offline page, whether the
// server is unreachable or the browser has no connection at all.
test("navigating to a page with no offline copy shows the offline page when the server is unreachable", async ({
  page,
  context,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  await waitForServiceWorker(page);
  await context.route(/\/sign-ups$/, (route) => route.abort());

  await page.getByRole("link", { name: /pending/ }).click();

  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("navigating to a page with no offline copy shows the offline page when the browser has no connection", async ({
  page,
  context,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  await waitForServiceWorker(page);
  await context.setOffline(true);

  await page.getByRole("link", { name: /pending/ }).click();

  await expect(page.getByRole("heading", { name: "You're offline" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible();
});

test("sign-ups modal matches its snapshot", { tag: "@visual" }, async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await page.goto("/sign-ups");
  // The seeded sign-up date is fixed; masked in case of timezone differences.
  await expectPageSnapshot(page, "sign-ups", { mask: [page.locator("time")] });
});
