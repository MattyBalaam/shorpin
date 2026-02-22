import { test, expect } from "./fixtures";
import { login } from "./helpers";

test("owner can open config modal for their list", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("link", { name: "admin" }).first().click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: /Admin/ })).toBeVisible();
});

test("owner sees collaborator checkboxes in config modal", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  // Open config for Shopping list (collab is already a member)
  await page
    .locator("li")
    .filter({ has: page.getByRole("link", { name: "Shopping", exact: true }) })
    .getByRole("link", { name: "admin" })
    .click();

  await expect(page.getByRole("dialog")).toBeVisible();
  // collab should be visible as a checkbox option
  await expect(page.getByText(ctx.collabEmail)).toBeVisible();
});

test("owner can add a collaborator to a list", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  // Open config for Owner Empty list (no current members)
  await page
    .locator("li")
    .filter({ has: page.getByRole("link", { name: "Owner Empty" }) })
    .getByRole("link", { name: "admin" })
    .click();

  await expect(page.getByRole("dialog")).toBeVisible();

  // Check the collab user checkbox
  await page.getByLabel(ctx.collabEmail).check();
  await page.getByRole("button", { name: "Save" }).click();

  // Should redirect back to home page after saving
  await page.waitForURL("/");
  await expect(page).toHaveURL("/");
});
