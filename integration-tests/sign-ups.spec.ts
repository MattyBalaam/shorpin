import { test, expect } from "./fixtures";
import { login } from "./helpers";

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

  // Other parallel workers may still have pending entries so the count badge
  // may stay visible — just verify this worker's specific entry is gone.
  const pendingLink = page.getByRole("link", { name: /pending/ });
  if (await pendingLink.isVisible()) {
    await pendingLink.click();
    await expect(page.getByText(ctx.waitlistEmail)).not.toBeVisible();
  }
});

test("client-side navigation to a route with no offline handling of its own falls back to a friendly message when the server is unreachable", async ({
  page,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);

  // /sign-ups has no clientLoader and no route-level ErrorBoundary (unlike
  // home/list), so it's a convenient stand-in for any route that falls
  // through to root.tsx's boundary. Aborting just this request (rather than
  // going fully offline) reproduces the app's own server being unreachable
  // while the browser otherwise has a connection — root's ErrorBoundary
  // should still catch the resulting fetch failure with a friendly, retryable
  // message rather than a raw error dump.
  await page.route(/\/sign-ups\.data(\?|$)/, (route) => route.abort());

  await page.getByRole("link", { name: /pending/ }).click();

  await expect(page.getByText("Couldn't reach the server.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("client-side navigation to a route with no offline handling of its own shows an offline message when the browser itself has no connection", async ({
  page,
  context,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);

  // Genuinely offline (not just this one request aborted), distinguishing
  // ErrorState's two branches: navigator.onLine false takes priority over
  // the generic "server unreachable" wording. A real (non-SPA) navigation
  // would instead hit the service worker's offline.html fallback — clicking
  // the in-app link here keeps this on React Router's client-side data path,
  // which the service worker never touches (see README's "Error boundaries &
  // network-down UX").
  await context.setOffline(true);

  await page.getByRole("link", { name: /pending/ }).click();

  await expect(page.getByText("You're offline.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});
