import { expect, test } from "@playwright/test";
import { login, resetDb, type TestContext } from "../integration-tests/helpers";

type RouteSnapshot = {
  name: string;
  path: string;
  user?: "owner";
  // Content that changes between runs, painted over in the screenshot.
  mask?: string[];
};

// Every route that renders a page. Left out: logout (action only),
// auth/confirm (always redirects), the Sentry example page (its content
// depends on reaching Sentry) and the resource routes.
const routes: RouteSnapshot[] = [
  { name: "login", path: "/login" },
  { name: "forgot-password", path: "/forgot-password" },
  { name: "request-access", path: "/request-access" },
  { name: "set-password", path: "/set-password", user: "owner" },
  { name: "home", path: "/", user: "owner" },
  { name: "list", path: "/lists/shopping", user: "owner" },
  { name: "list-config", path: "/config/shopping", user: "owner" },
  { name: "confirm-delete", path: "/lists/shopping/confirm-delete", user: "owner" },
  // The seeded sign-up's date is the day the mock DB was reset.
  { name: "sign-ups", path: "/sign-ups", user: "owner", mask: ["time"] },
];

// The mock server's default seed users. Some modals list every user in the
// DB, so unlike the integration tests every test shares these fixed users and
// the config runs them serially — the DB then holds nothing else.
const ctx: TestContext = {
  ownerEmail: "owner@test.com",
  collabEmail: "collab@test.com",
  waitlistEmail: "pending@test.com",
};

for (const route of routes) {
  test(route.name, async ({ page }) => {
    await resetDb(page, ctx);

    if (route.user === "owner") {
      await login(page, ctx.ownerEmail);
    }

    await page.goto(route.path);
    await expect(page.locator(`html[data-hydrated-path="${route.path}"]`)).toBeAttached();
    await page.evaluate(() => document.fonts.ready);

    await expect(page).toHaveScreenshot(`${route.name}.png`, {
      fullPage: true,
      mask: route.mask?.map((selector) => page.locator(selector)),
    });
  });
}
