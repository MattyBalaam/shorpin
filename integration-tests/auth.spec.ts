import { test, expect } from "./fixtures";
import { expectPageSnapshot, login } from "./helpers";

test("user can sign out", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("button", { name: "Sign out" }).click();

  await page.waitForURL("/login");
  await expect(page).toHaveURL("/login");
  // The flash toast fires on first render, before the lazy Toaster has
  // loaded — guards the queue in app/lib/toast.ts.
  await expect(page.getByText("You have been logged out.")).toBeVisible();
});

for (const [name, path] of [
  ["login", "/login"],
  ["forgot-password", "/forgot-password"],
  ["request-access", "/request-access"],
] as const) {
  test(`${name} page matches its snapshot`, { tag: "@visual" }, async ({ page }) => {
    await page.goto(path);
    await expectPageSnapshot(page, name);
  });
}

test("set password page matches its snapshot", { tag: "@visual" }, async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await page.goto("/set-password");
  await expectPageSnapshot(page, "set-password");
});
