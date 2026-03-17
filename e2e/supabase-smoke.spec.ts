import { readFileSync } from "node:fs";
import { test, expect } from "@playwright/test";
import { CREDS_FILE } from "./supabase-setup.ts";

const { email, password } = JSON.parse(readFileSync(CREDS_FILE, "utf-8")) as {
  email: string;
  password: string;
};

test("supabase smoke", async ({ page }) => {
  const listName = `smoke-${Date.now()}`;
  const listSlug = listName; // already lowercase and URL-safe

  await test.step("login", async () => {
    await page.goto("/login");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");
  });

  await test.step("view lists", async () => {
    await expect(page.getByLabel("New list")).toBeVisible();
  });

  await test.step("add a list", async () => {
    await page.getByLabel("New list").fill(listName);
    await page.getByRole("button", { name: "Add" }).click();
    await page.waitForURL(`/lists/${listSlug}`);
  });

  await test.step("add an item", async () => {
    await page.getByLabel("New item").fill("Test item");
    await page.getByRole("button", { name: "Add" }).click();
    await expect(page.getByLabel("Edit Test item")).toBeVisible();
  });

  await test.step("delete the item", async () => {
    await page.getByRole("button", { name: "Delete Test item" }).click();
    await expect(page.getByLabel("Edit Test item")).not.toBeVisible();
  });

  await test.step("clean up: delete the list", async () => {
    await page.getByRole("link", { name: "Back to index" }).click();
    await page
      .locator("li")
      .filter({ has: page.getByRole("link", { name: listName }) })
      .getByRole("link", { name: "Configure" })
      .click();
    await page.getByRole("link", { name: "Delete list" }).click();
    await page.getByRole("button", { name: "Yes" }).click();
    await page.waitForURL("/");
    await expect(page.getByRole("link", { name: listName })).not.toBeVisible();
  });
});
