import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { login } from "./helpers";

/**
 * Navigate straight to a route and wait for client hydration, mirroring
 * list.spec.ts's openList but generalised to any path (used here for both
 * "/" and a list route).
 */
async function goto(page: Page, path: string) {
  await page.goto(path);
  await page.waitForURL(path);
  await expect(page.locator(`html[data-hydrated-path="${path}"]`)).toBeAttached();
}

function backgroundOf(page: Page, name: string) {
  return page.getByRole("button", { name }).evaluate((el) => getComputedStyle(el).backgroundColor);
}

// Regression test for a bug where <Theme>'s live-override <style> used
// href/precedence (React's resource-hoisting API, meant for stable content
// reused across the app's lifetime). Since href was derived from the colour
// values, every distinct list visited left its own permanent, never-removed
// override in <head> — the most recently inserted one then won the cascade
// everywhere, including on unrelated routes like home, after navigating
// away. See app/components/theme/theme.tsx.
test("a list's generated theme doesn't leak onto the home route after navigating away", async ({
  page,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  await goto(page, "/");
  const homeAddColourBefore = await backgroundOf(page, "Add");

  await goto(page, "/lists/shopping");
  const listPaletteColourBefore = await backgroundOf(page, "🎨");

  await page.getByRole("button", { name: "🎨" }).click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await page.getByRole("button", { name: "Use these colours" }).click();
  await expect(page.getByRole("dialog")).not.toBeVisible();

  // Sanity check: applying really did change the list's own theme colour —
  // otherwise "unchanged at home" below would pass for the wrong reason.
  const listPaletteColourAfter = await backgroundOf(page, "🎨");
  expect(listPaletteColourAfter).not.toBe(listPaletteColourBefore);

  await page.getByRole("link", { name: "Back to index" }).click();
  await expect(page.locator('html[data-hydrated-path="/"]')).toBeAttached();

  await expect(page.getByRole("button", { name: "Add" })).toHaveCSS(
    "background-color",
    homeAddColourBefore,
  );
});
