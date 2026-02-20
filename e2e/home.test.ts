import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("owner sees admin link for their list", async ({ page }) => {
  await login(page, "owner@test.com");

  await expect(page.getByText("My Private List")).toBeVisible();
  await expect(
    page.getByRole("link", { name: "admin" }).first()
  ).toBeVisible();
});

test("collaborator sees no admin link for shared list", async ({ page }) => {
  await login(page, "collab@test.com");

  await expect(page.getByText("Shared List")).toBeVisible();
  await expect(page.getByRole("link", { name: "admin" })).not.toBeVisible();
});
