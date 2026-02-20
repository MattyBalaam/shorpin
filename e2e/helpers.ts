import type { Page } from "@playwright/test";

export async function login(page: Page, email: string) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill("any-password"); // mock ignores the password
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL("/");
}
