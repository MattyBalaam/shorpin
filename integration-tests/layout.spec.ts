import { expect, test } from "./fixtures";
import { login } from "./helpers";

const listPath = "/lists/shopping";

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

    // Toasts are fixed overlays that animate in from off-screen, not layout.
    const overflowing = await page.evaluate(() =>
      [...document.querySelectorAll("body *")]
        .filter((el) => !el.closest("[data-sonner-toaster]"))
        .filter((el) => el.getBoundingClientRect().right > window.innerWidth + 1)
        .map((el) => `${el.tagName.toLowerCase()}.${el.className}`),
    );

    expect(overflowing).toEqual([]);
  });
}

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
