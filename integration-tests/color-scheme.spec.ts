import { expect, test } from "./fixtures";
import { login } from "./helpers";

test("the colour scheme toggle pins light or dark, and keeps after a reload", async ({
  page,
  ctx,
}) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await login(page, ctx.ownerEmail);
  const html = page.locator("html");
  const toggle = page.getByRole("button", { name: /^Colour scheme:/ });

  // Follows the OS by default.
  await expect(html).toHaveAttribute("data-color-scheme", "system");
  await expect(html).toHaveCSS("color-scheme", "dark");

  await toggle.click();
  await expect(toggle).toHaveAccessibleName("Colour scheme: Light");
  await expect(html).toHaveAttribute("data-color-scheme", "light");
  await expect(html).toHaveCSS("color-scheme", "light");

  // Server-rendered in the chosen scheme, so there's no flash of dark.
  const serverHtml = await (await page.request.get("/")).text();
  expect(serverHtml).toContain('data-color-scheme="light"');

  await page.reload();
  await expect(html).toHaveCSS("color-scheme", "light");

  await toggle.click();
  await expect(toggle).toHaveAccessibleName("Colour scheme: Dark");
  await page.emulateMedia({ colorScheme: "light" });
  await expect(html).toHaveCSS("color-scheme", "dark");

  // Back to Auto clears the cookie and follows the OS again.
  await toggle.click();
  await expect(toggle).toHaveAccessibleName("Colour scheme: Auto");
  await expect(html).toHaveCSS("color-scheme", "normal");
  expect((await page.context().cookies()).map(({ name }) => name)).not.toContain(
    "shorpin-color-scheme",
  );
});
