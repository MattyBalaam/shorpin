import { test, expect } from "./fixtures";
import { expectPageSnapshot, login } from "./helpers";

// Not yet ported to Solid. Stage 2, dialogs and styles: config, delete, style dialogs, app styles and colour scheme (see legacy/README.md).

test.fixme("owner can delete a list", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  // Open admin config for Owner Empty
  await page
    .locator("li")
    .filter({ has: page.getByRole("link", { name: "Owner Empty" }) })
    .getByRole("link", { name: "Configure" })
    .click();

  await expect(page.getByRole("dialog")).toBeVisible();

  // Navigate to the delete confirmation page
  await page.getByRole("link", { name: "Delete list" }).click();

  await expect(page.getByRole("heading", { name: "Delete?" })).toBeVisible();
  await expect(page.getByText("Are you sure?")).toBeVisible();

  // Confirm deletion
  await page.getByRole("button", { name: "Yes" }).click();

  // Should redirect to home page after deletion
  await page.waitForURL("/");

  // Owner Empty should no longer be in the list
  await expect(page.getByRole("link", { name: "Owner Empty" })).not.toBeVisible();
});

// Not yet ported to Solid. Stage 2, dialogs and styles: config, delete, style dialogs, app styles and colour scheme (see legacy/README.md).

test.fixme(
  "confirm delete page matches its snapshot",
  { tag: "@visual" },
  async ({ page, ctx }) => {
    await login(page, ctx.ownerEmail);
    await page.goto("/lists/shopping/confirm-delete");
    await expectPageSnapshot(page, "confirm-delete");
  },
);
