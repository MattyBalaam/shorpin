import { test, expect } from "./fixtures";
import { expectPageSnapshot, login } from "./helpers";

test("user can sign out", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);

  await page.getByRole("button", { name: "Sign out" }).click();

  await page.waitForURL("/login");
  await expect(page).toHaveURL("/login");
  await expect(page.getByText("You have been logged out.")).toBeVisible();
});

for (const [name, path] of [
  ["login", "/login"],
  ["forgot-password", "/forgot-password"],
  ["request-access", "/request-access"],
] as const) {
  // Not yet ported to Solid. Stage 4, sign-ups and the remaining auth pages (see legacy/README.md).
  test.fixme(`${name} page matches its snapshot`, { tag: "@visual" }, async ({ page }) => {
    await page.goto(path);
    await expectPageSnapshot(page, name);
  });
}

// Not yet ported to Solid. Stage 4, sign-ups and the remaining auth pages (see legacy/README.md).
test.fixme("set password page matches its snapshot", { tag: "@visual" }, async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await page.goto("/set-password");
  await expectPageSnapshot(page, "set-password");
});
