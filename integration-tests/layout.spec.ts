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
