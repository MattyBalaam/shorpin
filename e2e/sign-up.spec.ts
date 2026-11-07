import { randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

// The whole sign-up journey against the real e2e project: request access,
// get invited, follow the invite link, set a password, sign back in.
//
// The admin invites people from the Supabase dashboard, which emails them a
// link to /auth/confirm. Delivering that email is Supabase's concern, so the
// test asks the admin API for the same link instead (generateLink sends
// nothing) and follows it itself.

const url = process.env.VITE_SUPABASE_URL ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const email = `sign-up-${Date.now()}@test.invalid`;
const password = randomUUID();
let userId: string | undefined;

test.afterAll(async () => {
  await admin.from("waitlist").delete().eq("email", email);
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    if (error) console.error(`Failed to delete sign-up user: ${error.message}`);
  }
});

test("sign up", async ({ page }) => {
  await test.step("request access", async () => {
    await page.goto("/login");
    await page.getByRole("link", { name: "Request access" }).click();
    await page.waitForURL("/request-access");
    await page.getByLabel("First name").fill("Sign");
    await page.getByLabel("Last name").fill("Up");
    await page.getByLabel("Email").fill(email);
    await page.getByRole("button", { name: "Request access" }).click();
    await page.waitForURL("/login");
    await expect(page.getByText("Your account is being verified.")).toBeVisible();
  });

  await test.step("the request is on the waitlist", async () => {
    const { data, error } = await admin
      .from("waitlist")
      .select("first_name, last_name")
      .eq("email", email);
    expect(error).toBeNull();
    expect(data).toEqual([{ first_name: "Sign", last_name: "Up" }]);
  });

  const tokenHash = await test.step("the admin invites them", async () => {
    const { data, error } = await admin.auth.admin.generateLink({ type: "invite", email });
    expect(error).toBeNull();
    userId = data.user?.id;
    return data.properties?.hashed_token ?? "";
  });

  await test.step("follow the invite link", async () => {
    await page.goto(`/auth/confirm?token_hash=${tokenHash}&type=invite`);
    await page.waitForURL("/set-password");
  });

  await test.step("set a password", async () => {
    await page.getByLabel("New password").fill(password);
    await page.getByLabel("Confirm password").fill(password);
    await page.getByRole("button", { name: "Update password" }).click();
    await page.waitForURL("/");
    await expect(page.getByLabel("New list")).toBeVisible();
  });

  await test.step("sign out", async () => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL("/login");
  });

  await test.step("sign in with the new password", async () => {
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL("/");
    await expect(page.getByLabel("New list")).toBeVisible();
  });

  await test.step("the invite link only works once", async () => {
    const response = await page.request.get(`/auth/confirm?token_hash=${tokenHash}&type=invite`, {
      maxRedirects: 0,
    });
    expect(response.status()).toBe(400);
  });
});
