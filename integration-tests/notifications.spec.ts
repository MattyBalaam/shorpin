import { expect, test } from "./fixtures";
import { login } from "./helpers";

// Otherwise "Offline support ready" can join the queue and shift the counts.
test.use({ serviceWorkers: "block" });

test("a success notification clears itself", async ({ page, ctx }) => {
  await login(page, ctx.ownerEmail);
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL("/login");

  const panel = page.getByRole("region", { name: "Notifications" });
  await expect(panel.getByText("You have been logged out.")).toBeVisible();
  await expect(panel).toHaveJSProperty("offsetHeight", 0, { timeout: 10_000 });
});

test("shows the newest notification with a count, and clears one or all", async ({
  page,
  ctx,
  context,
}) => {
  const panel = page.getByRole("region", { name: "Notifications" });
  const clear = panel.getByRole("button", { name: "Clear", exact: true });
  const clearAll = panel.getByRole("button", { name: "Clear all" });
  const offlineMessage = panel.getByText("You're offline - changes saved locally");
  const onlineMessage = panel.getByText("Back online - syncing changes");

  async function addOffline(item: string) {
    await context.setOffline(true);
    await page.getByLabel("New item").fill(item);
    await page.getByRole("button", { name: "Add" }).click();
  }

  // Lets the reconnect sync land, so it isn't aborted mid-request.
  async function reconnect() {
    const syncSubmitted = page.waitForResponse(
      (response) =>
        response.url().includes("/lists/shopping.data") && response.request().method() === "POST",
    );
    await context.setOffline(false);
    await syncSubmitted;
  }

  await login(page, ctx.ownerEmail);
  await page.goto("/lists/shopping");
  await expect(page.locator('html[data-hydrated-path="/lists/shopping"]')).toBeAttached();

  await addOffline("Offline butter");
  await expect(offlineMessage).toBeVisible();
  await expect(clearAll).toHaveCount(0);

  // Focus holds the "Back online" success open past its auto-clear.
  await clear.focus();
  await reconnect();
  await expect(onlineMessage).toBeVisible();
  await expect(panel.getByText("+1 more")).toBeVisible();

  // Clearing the newest reveals the one behind it.
  await clear.click();
  await expect(offlineMessage).toBeVisible();
  await expect(clearAll).toHaveCount(0);

  // A repeat moves the queued one to the front rather than stacking a copy.
  await addOffline("More butter");
  await expect(offlineMessage).toBeVisible();
  await expect(clearAll).toHaveCount(0);

  await reconnect();
  await expect(panel.getByText("+1 more")).toBeVisible();
  await clearAll.click();
  await expect(panel).toHaveJSProperty("offsetHeight", 0);
});
