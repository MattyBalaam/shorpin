import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { login } from "./helpers";

// Runs only in the "touch" project (emulated Pixel 7, see playwright.config.ts).
// Playwright's touchscreen API can only tap, so gestures go through Chromium's
// CDP Input.dispatchTouchEvent: genuine touch input that the browser turns
// into pointer events, applying touch-action and firing pointercancel if it
// decides to scroll instead — exactly what mouse emulation skips.

const listPath = (slug: string) => `/lists/${slug}`;

// "Offline support ready" would open the notification panel at an arbitrary
// point, shifting the rows mid-gesture.
test.use({ serviceWorkers: "block" });

async function openList(page: Page, slug: string) {
  await page.goto(listPath(slug));
  await page.waitForURL(listPath(slug));
  await expect(page.locator(`html[data-hydrated-path="${listPath(slug)}"]`)).toBeAttached();
}

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

const row = (page: Page, item: string) =>
  page.locator("li").filter({ has: page.getByLabel(`Edit ${item}`) });

// Swipe-to-delete is the browser's own sideways scrolling, snapped: each
// row scrolls onto a Delete button. No script is involved.
test("swiping a row reveals Delete, which deletes it and persists", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  const milk = row(page, "Milk");
  await touchDrag(page, "Edit Milk", { dx: -200, steps: 10, stepDelay: 16 });
  const scroller = milk.locator(".item-container");
  await expect.poll(() => scroller.evaluate((element) => element.scrollLeft)).toBeGreaterThan(0);

  const reveal = milk.locator(".item-swipe-delete");
  await expect(reveal).toBeInViewport();
  const box = await reveal.boundingBox();
  if (!box) throw new Error("Delete not revealed");
  await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);

  await expect(page.getByLabel("Edit Milk")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Recreate last deleted" })).toBeVisible();
  await openList(page, "shopping");
  await expect(page.getByLabel("Edit Milk")).toHaveCount(0);
});

test("a short swipe snaps the row back", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  // Slowly, and held before letting go: a quick flick carries on to Delete.
  await touchDrag(page, "Edit Eggs", { dx: -20, steps: 10, stepDelay: 50, holdBeforeRelease: 300 });
  await expect
    .poll(() =>
      row(page, "Eggs")
        .locator(".item-container")
        .evaluate((element) => element.scrollLeft),
    )
    .toBe(0);
  await expect(page.getByLabel("Edit Eggs")).toBeVisible();
});

// Native drag and drop on touch depends on the browser's long-press support,
// which Chromium's touch emulation can't drive; on touch screens the ↑/↓
// buttons stay visible as the dependable route.
test("the move buttons reorder items on a touch screen", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  const first = () => page.locator(".item-edit-button").first();
  await expect(first()).toHaveAccessibleName("Edit Milk");
  await page.getByRole("button", { name: "Move Bread up" }).tap();
  await expect(first()).toHaveAccessibleName("Edit Bread");

  await openList(page, "shopping");
  await expect(first()).toHaveAccessibleName("Edit Bread");
});

test("tapping the edge of the edit button opens the editor, not a drag", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await openList(page, "shopping");

  // The drag handle's enlarged hit area sits beside the edit button; it must
  // stop short of the button itself.
  const box = await page.getByRole("button", { name: "Edit Milk" }).boundingBox();
  if (!box) throw new Error('Unable to determine position of "Edit Milk"');
  await page.touchscreen.tap(box.x + box.width - 2, box.y + box.height / 2);

  await expect(page.getByRole("dialog", { name: "Edit item" })).toBeVisible();
});
