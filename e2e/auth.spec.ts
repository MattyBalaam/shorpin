import { test, expect } from "./fixtures";
import { login } from "./helpers";

test("user can sign out", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("button", { name: "Sign out" }).click();

  await page.waitForURL("/login");
  await expect(page).toHaveURL("/login");
});
