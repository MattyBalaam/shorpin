import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { login } from "./helpers";

// Runs only in the "touch" project (emulated Pixel 7, see playwright.config.ts).
// Playwright's touchscreen API can only tap, so gestures go through Chromium's
// CDP Input.dispatchTouchEvent: genuine touch input that the browser turns
// into pointer events, applying touch-action and firing pointercancel if it
// decides to scroll instead — exactly what mouse emulation skips.

const listPath = (slug: string) => `/lists/${slug}`;

async function openList(page: Page, slug: string) {
  await page.goto(listPath(slug));
  await page.waitForURL(listPath(slug));
  await expect(page.locator(`html[data-hydrated-path="${listPath(slug)}"]`)).toBeAttached();
}

// Comfortably past the hook's LONG_PRESS_MS, which touch reorders require.
const LONG_PRESS = 500;

/** Touch-drags from the centre of the element labelled `label`. */
async function touchDrag(
  page: Page,
  label: string,
  {
    dx = 0,
    dy = 0,
    steps = 10,
    stepDelay = 0,
    holdBeforeMove = 0,
    holdBeforeRelease = 0,
  }: {
    dx?: number;
    dy?: number;
    steps?: number;
    stepDelay?: number;
    holdBeforeMove?: number;
    holdBeforeRelease?: number;
  },
) {
  const box = await page.getByLabel(label).boundingBox();
  if (!box) throw new Error(`Unable to determine position of "${label}"`);
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;

  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x, y }] });
  if (holdBeforeMove) await page.waitForTimeout(holdBeforeMove);
  for (let step = 1; step <= steps; step++) {
    await cdp.send("Input.dispatchTouchEvent", {
      type: "touchMove",
      touchPoints: [{ x: x + (dx * step) / steps, y: y + (dy * step) / steps }],
    });
    if (stepDelay) await page.waitForTimeout(stepDelay);
  }
  if (holdBeforeRelease) await page.waitForTimeout(holdBeforeRelease);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
  await cdp.detach();
}

async function centreDistance(page: Page, fromLabel: string, toLabel: string) {
  const from = await page.getByLabel(fromLabel).boundingBox();
  const to = await page.getByLabel(toLabel).boundingBox();
  if (!from || !to) throw new Error("Unable to determine drag handle positions");
  return to.y + to.height / 2 - (from.y + from.height / 2);
}

// The seeded Shopping list has more items; these tests only move the first three.
const itemOrder = (page: Page) =>
  page
    .locator('li input[type="hidden"][name$=".value"]')
    .evaluateAll((elements) =>
      elements.slice(0, 3).map((element) => (element as HTMLInputElement).value),
    );

// Reorders persist on release; wait for that POST before reloading, otherwise
// the reload can abort it.
const reorderSaved = (page: Page) =>
  page.waitForResponse((response) => response.request().method() === "POST");

const listOrder = (page: Page) =>
  page
    .locator('li a[href^="/lists/"]')
    .evaluateAll((elements) =>
      elements.map((element) => element.textContent?.trim() ?? "").filter(Boolean),
    );

test("swiping an item far enough deletes it and persists", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  await touchDrag(page, "Reorder Milk", {
    dx: -200,
    steps: 20,
    stepDelay: 10,
    holdBeforeRelease: 200,
  });

  await expect(page.getByLabel("Edit Milk")).not.toBeVisible();
  await expect(page.getByRole("button", { name: "Recreate last deleted" })).toBeVisible();

  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Milk")).toHaveCount(0);
  await expect(page.getByLabel("Edit Bread")).toBeVisible();
});

test("a quick short fling deletes an item", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  await touchDrag(page, "Reorder Bread", { dx: 90, steps: 3 });

  await expect(page.getByLabel("Edit Bread")).not.toBeVisible();
  await expect(page.getByLabel("Edit Milk")).toBeVisible();
});

test("a slow short swipe springs the item back instead of deleting", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  await touchDrag(page, "Reorder Eggs", {
    dx: -80,
    steps: 10,
    stepDelay: 10,
    holdBeforeRelease: 200,
  });

  const row = page.locator("li").filter({ has: page.getByLabel("Edit Eggs") });
  await expect(row).toBeVisible();
  await expect(row).toHaveCSS("transform", "none");
  await expect(page.getByRole("button", { name: "Recreate last deleted" })).toHaveCount(0);
});

test("vertical touch drag reorders list items without scrolling the page", async ({
  page,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");
  await expect.poll(() => itemOrder(page)).toEqual(["Milk", "Bread", "Eggs"]);

  const scrollBefore = await page.evaluate(() => window.scrollY);
  const distance = await centreDistance(page, "Reorder Milk", "Reorder Eggs");
  const saved = reorderSaved(page);
  await touchDrag(page, "Reorder Milk", {
    dy: distance + 10,
    steps: 20,
    stepDelay: 10,
    holdBeforeMove: LONG_PRESS,
  });
  await saved;

  await expect.poll(() => itemOrder(page)).toEqual(["Bread", "Eggs", "Milk"]);
  // Once lifted, the hook cancels touchmove — the browser must not pan the page.
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollBefore);

  await openList(page, "shopping");
  await expect.poll(() => itemOrder(page)).toEqual(["Bread", "Eggs", "Milk"]);
});

test("vertical touch drag reorders lists on home", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await expect.poll(() => listOrder(page)).toEqual(["Shopping", "Owner Empty"]);

  const distance = await centreDistance(page, "Reorder Owner Empty", "Reorder Shopping");
  const saved = reorderSaved(page);
  await touchDrag(page, "Reorder Owner Empty", {
    dy: distance - 10,
    steps: 20,
    stepDelay: 10,
    holdBeforeMove: LONG_PRESS,
  });
  await saved;

  await expect.poll(() => listOrder(page)).toEqual(["Owner Empty", "Shopping"]);

  await page.reload();
  await expect.poll(() => listOrder(page)).toEqual(["Owner Empty", "Shopping"]);
});

test("a vertical touch drag without a long-press doesn't reorder", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");
  await expect.poll(() => itemOrder(page)).toEqual(["Milk", "Bread", "Eggs"]);

  const distance = await centreDistance(page, "Reorder Milk", "Reorder Eggs");
  await touchDrag(page, "Reorder Milk", { dy: distance + 10, steps: 20, stepDelay: 10 });

  // The handle allows vertical panning, so this is a scroll, not a reorder.
  await page.waitForTimeout(300);
  expect(await itemOrder(page)).toEqual(["Milk", "Bread", "Eggs"]);
});

test("a swipe that drifts a full row vertically reorders instead of deleting", async ({
  page,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");
  await expect.poll(() => itemOrder(page)).toEqual(["Milk", "Bread", "Eggs"]);

  const distance = await centreDistance(page, "Reorder Milk", "Reorder Bread");
  const saved = reorderSaved(page);
  // Mostly horizontal, so it starts as a swipe, but it also travels a row and a
  // bit downwards — past the far swipe-delete distance.
  await touchDrag(page, "Reorder Milk", { dx: -200, dy: distance + 10, steps: 20, stepDelay: 10 });
  await saved;

  await expect(page.getByLabel("Edit Milk")).toBeVisible();
  await expect.poll(() => itemOrder(page)).toEqual(["Bread", "Milk", "Eggs"]);
  await expect(page.getByRole("button", { name: "Recreate last deleted" })).toHaveCount(0);
});
