import { expect, test } from "./fixtures";
import { login } from "./helpers";

const listPath = "/lists/shopping";

// "Offline support ready" would open the notification panel at an arbitrary
// point, resizing the list's scroll area mid-test.
test.use({ serviceWorkers: "block" });

const longItem = "Pearl river bridge / Kadoya / Kikkoman / Mushan premium soy (if you can find it)";

for (const width of [320, 375]) {
  test(`list has no horizontal overflow at ${width}px`, async ({ page, ctx }) => {
    await page.setViewportSize({ width, height: 700 });
    await login(page, ctx.ownerEmail);
    await page.goto(listPath);
    await expect(page.locator(`html[data-hydrated-path="${listPath}"]`)).toBeAttached();

    await page.getByLabel("New item").fill(longItem);
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByLabel(`Edit ${longItem}`)).toBeVisible();

    const overflowing = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`),
    );

    expect(overflowing).toEqual([]);
  });
}

// WebKit takes the fallback anyway; in Chromium this fakes the absence of
// scroll-state queries to the ref callback and checks the attributes it sets
// in their place (the queries still apply here, so opacity isn't the
// fallback's to check).
test("scroll edges fall back to attributes without scroll-state queries @webkit", async ({
  page,
  ctx,
}) => {
  await page.addInitScript(() => {
    const supports = CSS.supports.bind(CSS);
    CSS.supports = (...args: [string, string?]) =>
      args[0] === "container-type" && args[1] === "scroll-state"
        ? false
        : supports(...(args as [string, string]));
  });
  const edges = () =>
    page.evaluate(() => {
      const scroller = document.querySelector("ul")?.parentElement;
      return [
        scroller?.hasAttribute("data-scrollable-top"),
        scroller?.hasAttribute("data-scrollable-bottom"),
      ];
    });
  const scrollTo = (top: number) =>
    page.evaluate((top) => {
      document.querySelector("ul")?.parentElement?.scrollTo({ top, behavior: "instant" });
    }, top);

  await page.setViewportSize({ width: 375, height: 420 });
  await login(page, ctx.ownerEmail);
  await page.goto(listPath);
  await expect(page.locator(`html[data-hydrated-path="${listPath}"]`)).toBeAttached();
  await expect(page.getByLabel("Edit Coffee")).toBeAttached();

  await expect.poll(edges).toEqual([false, true]);
  await scrollTo(100);
  await expect.poll(edges).toEqual([true, true]);
  await scrollTo(1e6);
  await expect.poll(edges).toEqual([true, false]);
  // Growing the viewport until nothing scrolls clears both.
  await page.setViewportSize({ width: 375, height: 4000 });
  await expect.poll(edges).toEqual([false, false]);
});

test("scroll edges show only where there's more to scroll @webkit", async ({ page, ctx }) => {
  const edgeOpacities = () =>
    page.evaluate(() => {
      const scroller = document.querySelector("ul")?.parentElement;
      const opacity = (el: Element | null | undefined) =>
        el ? Number(getComputedStyle(el).opacity) : NaN;
      return [opacity(scroller?.firstElementChild), opacity(scroller?.lastElementChild)];
    });
  const scrollTo = (top: number) =>
    page.evaluate((top) => {
      document.querySelector("ul")?.parentElement?.scrollTo({ top, behavior: "instant" });
    }, top);

  // A short viewport so the seeded rows overflow the list's scroll area.
  await page.setViewportSize({ width: 375, height: 420 });
  await login(page, ctx.ownerEmail);
  await page.goto(listPath);
  await expect(page.locator(`html[data-hydrated-path="${listPath}"]`)).toBeAttached();
  await expect(page.getByLabel("Edit Coffee")).toBeAttached();

  await expect.poll(edgeOpacities).toEqual([0, 1]);
  await scrollTo(100);
  await expect.poll(edgeOpacities).toEqual([1, 1]);
  await scrollTo(1e6);
  await expect.poll(edgeOpacities).toEqual([1, 0]);
  // The last row ends flush with the scroll area, with no space below it.
  const gapBelow = await page.evaluate(() => {
    const list = document.querySelector("ul");
    const scroller = list?.parentElement;
    const last = list?.lastElementChild;
    if (!scroller || !last) return NaN;
    return scroller.getBoundingClientRect().bottom - last.getBoundingClientRect().bottom;
  });
  // Within a pixel: scroll offsets snap to whole pixels, rows don't.
  expect(Math.abs(gapBelow)).toBeLessThan(1);

  // Nothing to scroll: neither edge shows.
  await page.goto("/lists/owner-empty");
  await expect(page.locator(`html[data-hydrated-path="/lists/owner-empty"]`)).toBeAttached();
  await expect.poll(edgeOpacities).toEqual([0, 0]);
  // The edge strips don't push a short list down.
  const offset = await page.evaluate(() => {
    const list = document.querySelector("ul");
    const scroller = list?.parentElement;
    if (!list || !scroller) return NaN;
    return list.getBoundingClientRect().top - scroller.getBoundingClientRect().top;
  });
  expect(offset).toBe(0);
});
