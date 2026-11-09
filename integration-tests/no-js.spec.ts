import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// The "no-js" project runs this with JavaScript turned off: every core flow
// must work as plain HTML — links, forms, redirects, <dialog> and invoker
// commands — before any enhancement script is involved.

async function signIn(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("any-password");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}

test("signing in and out", async ({ page, ctx }) => {
  await page.goto("/");
  await expect(page).toHaveURL("/login");
  await signIn(page, ctx.ownerEmail);
  await expect(page.getByText("Welcome back!")).toBeVisible();
  await expect(page.getByRole("link", { name: "Shopping", exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL("/login");
  await expect(page.getByText("You have been logged out.")).toBeVisible();
});

test("a sign-in form error comes back from the server", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("not-an-email");
  await page.getByLabel("Password").fill("x");
  // Skips the browser's own validation, to reach the server's.
  await page
    .locator("form.auth-field-form")
    .evaluate((form) => form.setAttribute("novalidate", ""));
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email")).toBeVisible();
  await expect(page.getByLabel("Email")).toHaveValue("not-an-email");
});

test("creating a list and adding, tagging, editing and deleting items", async ({ page, ctx }) => {
  await signIn(page, ctx.ownerEmail);

  await page.getByLabel("New list").fill("Camping");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page).toHaveURL("/lists/camping");
  await expect(page.getByText('List "Camping" created successfully!')).toBeVisible();
  await expect(page.getByText("No items yet — add one below")).toBeVisible();

  await page.getByLabel("New item").fill("Tent");
  await page.getByRole("combobox", { name: "Tag" }).first().fill("gear");
  await page.getByRole("button", { name: "Add" }).click();
  const tent = page.locator("li").filter({ has: page.getByLabel("Edit Tent") });
  await expect(tent.getByText("tag: gear")).toBeVisible();
  // The tag stays for the next add.
  await expect(page.getByRole("combobox", { name: "Tag" }).first()).toHaveValue("gear");

  await page.getByLabel("New item").fill("Stove");
  await page.getByRole("button", { name: "Add" }).click();
  await expect(page.getByLabel("Edit Stove")).toBeVisible();

  // The edit dialog opens with an invoker command, no script.
  await page.getByRole("button", { name: "Edit Tent" }).click();
  const dialog = page.getByRole("dialog", { name: "Edit item" });
  await dialog.getByLabel("Item").fill("Two-person tent");
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByLabel("Edit Two-person tent")).toBeVisible();

  await page.getByRole("button", { name: "Delete Stove" }).click();
  await expect(page.getByLabel("Edit Stove")).toHaveCount(0);
  await page.getByRole("button", { name: "Recreate last deleted" }).click();
  await expect(page.getByLabel("Edit Stove")).toBeVisible();
  await expect(page.getByRole("button", { name: "Recreate last deleted" })).toHaveCount(0);
});

test("reordering items and lists with the move buttons", async ({ page, ctx }) => {
  await signIn(page, ctx.ownerEmail);

  const firstList = page.locator(".home-item-link").first();
  await expect(firstList).toHaveText("Shopping");
  await page.getByRole("button", { name: "Move Owner Empty up" }).click();
  await expect(firstList).toHaveText("Owner Empty");

  await page.goto("/lists/shopping");
  const firstItem = page.locator(".item-edit-button").first();
  await expect(firstItem).toHaveAccessibleName("Edit Milk");
  await page.getByRole("button", { name: "Move Milk down" }).click();
  await expect(firstItem).toHaveAccessibleName("Edit Bread");

  await page.getByRole("button", { name: "Group by tag" }).click();
  await page.getByRole("button", { name: "Group by tag" }).click();
  await expect(page.getByText("Already grouped by tag")).toBeVisible();
});

test("the style dialog, colours and colour scheme", async ({ page, ctx }) => {
  await signIn(page, ctx.ownerEmail);
  const html = page.locator("html");

  await page.getByRole("link", { name: "Style", exact: true }).click();
  await expect(page).toHaveURL("/style");
  const dialog = page.getByRole("dialog", { name: "Style" });
  await dialog.getByRole("radio", { name: /^Brutalist/ }).check();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page).toHaveURL("/");
  await expect(html).toHaveAttribute("data-app-style", "brutalist");

  await page.getByRole("button", { name: /^Colour scheme:/ }).click();
  await expect(html).toHaveAttribute("data-color-scheme", "light");

  await page.goto("/lists/shopping");
  await page.getByRole("button", { name: "Colours", exact: true }).click();
  const colours = page.getByRole("dialog", { name: "Colours" });
  await colours.getByRole("link", { name: "Shuffle" }).click();
  await expect(page).toHaveURL(/colours=/);
  await page
    .getByRole("dialog", { name: "Colours" })
    .getByRole("button", { name: "Use these colours" })
    .click();
  await expect(page).toHaveURL("/lists/shopping");
  expect(await page.locator("style#list-palette").textContent()).toContain("--palette-primary");
});

test("sharing a list and deleting it", async ({ page, ctx }) => {
  await signIn(page, ctx.ownerEmail);

  await page.getByRole("link", { name: "Configure" }).first().click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel(ctx.collabEmail).check();
  await dialog.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("changed collaborators")).toBeVisible();

  await page.goto("/config/owner-empty");
  await page.getByRole("link", { name: "Delete list" }).click();
  await page.getByRole("button", { name: "Yes" }).click();
  await expect(page).toHaveURL("/");
  await expect(page.getByRole("link", { name: "Owner Empty" })).toHaveCount(0);
});
