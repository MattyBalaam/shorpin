import type { Page } from "@playwright/test";
import { expectNoUnexpectedA11yViolations } from "./a11y";
import { expect, test } from "./fixtures";
import { login } from "./helpers";

async function goto(page: Page, path: string) {
  await page.goto(path);
  await expect(page.locator(`html[data-hydrated-path="${path}"]`)).toBeAttached();
}

async function pickStyle(page: Page, name: RegExp, action: "Save" | "Cancel") {
  await page.getByRole("button", { name: "Style", exact: true }).click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("radio", { name }).check();
  await dialog.getByRole("button", { name: action }).click();
  await expect(dialog).not.toBeVisible();
}

test("a style only applies once saved, and keeps after a reload", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  const html = page.locator("html");
  await expect(html).toHaveAttribute("data-app-style", "classic");

  await page.getByRole("button", { name: "Style", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Style" });
  await dialog.getByRole("radio", { name: /^Brutalist/ }).check();
  // Choosing only moves the selection; the app behind is untouched.
  await expect(html).toHaveAttribute("data-app-style", "classic");
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(html).toHaveAttribute("data-app-style", "classic");

  await pickStyle(page, /^Brutalist/, "Save");
  await expect(html).toHaveAttribute("data-app-style", "brutalist");
  await expect(page.getByRole("button", { name: "Add", exact: true })).toHaveCSS(
    "border-top-width",
    "3px",
  );

  // Server-rendered with the chosen style, so there's no flash of Classic.
  const serverHtml = await (await page.request.get("/")).text();
  expect(serverHtml).toContain('data-app-style="brutalist"');

  await page.reload();
  await expect(html).toHaveAttribute("data-app-style", "brutalist");
});

test("a list's own style overrides the device style on that list only", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  const html = page.locator("html");

  await goto(page, "/lists/shopping");
  await expect(html).toHaveAttribute("data-app-style", "classic");

  const saved = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().includes("/lists/shopping"),
  );
  await pickStyle(page, /^GOV\.UK/, "Save");
  await expect(html).toHaveAttribute("data-app-style", "gov-uk");
  await saved;

  // Stored on the list: rendered by the server on a fresh load.
  await page.reload();
  await expect(html).toHaveAttribute("data-app-style", "gov-uk");

  await page.getByRole("link", { name: "Back to index" }).click();
  await expect(page.locator('html[data-hydrated-path="/"]')).toBeAttached();
  await expect(html).toHaveAttribute("data-app-style", "classic");

  await goto(page, "/lists/shopping");
  const cleared = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" && response.url().includes("/lists/shopping"),
  );
  await pickStyle(page, /^My style/, "Save");
  await cleared;
  await expect(html).toHaveAttribute("data-app-style", "classic");
  await page.reload();
  await expect(html).toHaveAttribute("data-app-style", "classic");
});

test("a11y: style picker", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await page.getByRole("button", { name: "Style", exact: true }).click();
  await expect(page.getByRole("dialog", { name: "Style" })).toBeVisible();

  await expectNoUnexpectedA11yViolations(page, {
    // Same allowances as the home route behind the dialog (see a11y.spec.ts).
    allowedRuleIds: ["aria-required-children", "button-name", "color-contrast", "list"],
  });
});

test("on a short screen the picker's options scroll while its actions stay in view", async ({
  page,
  ctx,
}) => {
  await page.setViewportSize({ width: 390, height: 500 });
  await login(page, ctx.ownerEmail);
  await page.getByRole("button", { name: "Style", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Style" });
  const heading = dialog.getByRole("heading", { name: "Style" });
  const save = dialog.getByRole("button", { name: "Save" });

  await expect(save).toBeInViewport({ ratio: 1 });
  await expect(heading).toBeInViewport({ ratio: 1 });

  // The last option is out of view until the options list scrolls to it.
  const last = dialog.getByRole("radio", { name: /^MySpace/ });
  await expect(last).not.toBeInViewport();
  await last.scrollIntoViewIfNeeded();
  await expect(last).toBeInViewport();
  await expect(save).toBeInViewport({ ratio: 1 });
  await expect(heading).toBeInViewport({ ratio: 1 });
});

test("the style belongs to the account: signed-out pages are default, and it follows the user to another device", async ({
  page,
  browser,
  ctx,
}) => {
  await login(page, ctx.ownerEmail);
  const html = page.locator("html");

  const saved = page.waitForResponse((response) =>
    Boolean(response.request().postData()?.includes("set-app-style")),
  );
  await pickStyle(page, /^Brutalist/, "Save");
  await saved;
  await expect(html).toHaveAttribute("data-app-style", "brutalist");

  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("/login");
  await expect(html).toHaveAttribute("data-app-style", "classic");

  // Back from the profile, not a leftover cookie: sign-out expired it.
  await login(page, ctx.ownerEmail);
  await expect(html).toHaveAttribute("data-app-style", "brutalist");

  // A fresh browser has no cookie at all — a different device.
  const otherDevice = await browser.newContext({ baseURL: test.info().project.use.baseURL });
  const otherPage = await otherDevice.newPage();
  await login(otherPage, ctx.ownerEmail);
  await expect(otherPage.locator("html")).toHaveAttribute("data-app-style", "brutalist");
  await otherDevice.close();
});
