import { test, expect } from "./fixtures";
import { expectPageSnapshot, login, serverFnRequests } from "./helpers";

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

test("client-side navigation to a route with no offline handling of its own falls back to a friendly message when the server is unreachable", async ({
  page,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);

  // /sign-ups has no offline fallback (unlike home and the list), so it
  // stands in for any route whose loader error reaches root's error
  // component. Aborting just its request (rather than going fully offline)
  // reproduces the app's own server being unreachable while the browser is
  // otherwise connected: root should still show a friendly, retryable
  // message rather than a raw error.
  await page.route(serverFnRequests("getSignUps"), (route) => route.abort());

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
  // the in-app link here keeps this on the router's client-side data path
  // (a server function call), which the service worker never touches (see
  // README's "Error boundaries & network-down UX").
  await context.setOffline(true);

  await page.getByRole("link", { name: /pending/ }).click();

  await expect(page.getByText("You're offline.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
});

test("sign-ups modal matches its snapshot", { tag: "@visual" }, async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await page.goto("/sign-ups");
  // The seeded sign-up date is fixed; masked in case of timezone differences.
  await expectPageSnapshot(page, "sign-ups", { mask: [page.locator("time")] });
});
