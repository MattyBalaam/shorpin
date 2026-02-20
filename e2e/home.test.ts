import { test, expect } from "@playwright/test";
import { login } from "./helpers";

test("owner sees their two lists", async ({ page }) => {
  await login(page, "owner@test.com");

  await expect(page.getByText("Shopping")).toBeVisible();
  await expect(page.getByText("Owner Empty")).toBeVisible();
});

test("owner sees admin link for both their lists", async ({ page }) => {
  await login(page, "owner@test.com");

  await expect(page.getByRole("link", { name: "admin" })).toHaveCount(2);
});

test("collaborator sees their lists plus the shared list", async ({ page }) => {
  await login(page, "collab@test.com");

  await expect(page.getByText("Collab Shopping")).toBeVisible();
  await expect(page.getByText("Collab Empty")).toBeVisible();
  await expect(page.getByText("Shopping")).toBeVisible(); // shared from owner
});

test("collaborator sees admin only for their own lists, not the shared one", async ({
  page,
}) => {
  await login(page, "collab@test.com");

  // Collab owns 2 lists → 2 admin links, but not for the shared Shopping list
  await expect(page.getByRole("link", { name: "admin" })).toHaveCount(2);
});
