import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

interface ManifestIcon {
  src: string;
  purpose?: string;
}

// Decodes an icon in the page and returns the range of its alpha channel.
// The original icons were exported at ~6% opacity and rendered as a faint
// smudge on home screens; these checks stop a regenerated set repeating that.
async function alphaRange(page: Page, src: string) {
  return page.evaluate(async (url) => {
    const bitmap = await createImageBitmap(await (await fetch(url)).blob());
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No 2d context");
    context.drawImage(bitmap, 0, 0);
    const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
    let min = 255;
    let max = 0;
    for (let i = 3; i < data.length; i += 4) {
      min = Math.min(min, data[i]);
      max = Math.max(max, data[i]);
    }
    return { min, max };
  }, src);
}

async function linkHref(page: Page, rel: string) {
  const href = await page.locator(`link[rel="${rel}"]`).getAttribute("href");
  if (!href) throw new Error(`No <link rel="${rel}">`);
  return href;
}

test("manifest icons load, include a maskable icon, and are opaque", async ({ page }) => {
  await page.goto("/login");

  const response = await page.request.get(await linkHref(page, "manifest"));
  const { icons } = (await response.json()) as { icons: ManifestIcon[] };

  expect(icons.some((icon) => icon.purpose === "maskable")).toBe(true);
  for (const icon of icons) {
    expect((await page.request.get(icon.src)).ok(), icon.src).toBe(true);
    const { min, max } = await alphaRange(page, icon.src);
    expect(max, icon.src).toBe(255);
    // A maskable icon is cropped to arbitrary shapes, so it must be full-bleed.
    if (icon.purpose === "maskable") expect(min, icon.src).toBe(255);
  }
});

test("apple-touch-icon loads with no transparency for iOS to fill black", async ({ page }) => {
  await page.goto("/login");

  const href = await linkHref(page, "apple-touch-icon");
  expect((await page.request.get(href)).ok()).toBe(true);
  expect((await alphaRange(page, href)).min).toBe(255);
});
