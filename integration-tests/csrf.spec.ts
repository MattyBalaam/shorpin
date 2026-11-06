import { expect, test } from "@playwright/test";
import { serverFnRequests } from "./helpers";

// src/start.ts's CSRF middleware: cross-site mutations get a 403, the app's
// own requests and non-browser clients pass, and reads are never checked.

const publicOrigin = "https://shorpin.matthewbalaam.co.uk";

test.describe("a POST to /perf", () => {
  const metric = { kind: "web-vital", name: "LCP", value: 1200, unit: "ms", pathname: "/" };

  const cases: [string, Record<string, string>, number][] = [
    ["from the same origin passes", { "sec-fetch-site": "same-origin" }, 204],
    ["from another site is refused", { "sec-fetch-site": "cross-site" }, 403],
    ["from a sibling subdomain is refused", { "sec-fetch-site": "same-site" }, 403],
    ["with a foreign Origin is refused", { origin: "https://evil.example" }, 403],
    ["with the public Origin passes (behind the proxy)", { origin: publicOrigin }, 204],
    ["with a foreign Referer is refused", { referer: "https://evil.example/page" }, 403],
    ["with no browser headers passes (scripts)", {}, 204],
  ];

  for (const [name, headers, status] of cases) {
    test(name, async ({ request }) => {
      const response = await request.post("/perf", { data: metric, headers });
      expect(response.status()).toBe(status);
    });
  }
});

test("a server function call replayed from another site is refused", async ({ page }) => {
  await page.goto("/login");
  await expect(page.locator('html[data-hydrated-path="/login"]')).toBeAttached();
  await page.getByLabel("Email").fill("csrf@example.com");
  await page.getByLabel("Password").fill("any-password");

  const pattern = serverFnRequests("signIn");
  // Hold the browser's own call so the replays below are the only ones the
  // server sees.
  await page.route(pattern, (route) => route.abort());
  const [signIn] = await Promise.all([
    page.waitForRequest((request) => pattern.test(request.url())),
    page.getByRole("button", { name: "Sign in" }).click(),
  ]);

  const replay = (headers: Record<string, string>) =>
    page.request.fetch(signIn.url(), {
      method: signIn.method(),
      headers: { ...signIn.headers(), ...headers },
      data: signIn.postDataBuffer() ?? undefined,
    });

  expect((await replay({ "sec-fetch-site": "cross-site" })).status()).toBe(403);
  expect((await replay({ "sec-fetch-site": "same-origin" })).status()).not.toBe(403);
});

test("a page linked from another site still loads", async ({ request }) => {
  const response = await request.get("/login", { headers: { "sec-fetch-site": "cross-site" } });
  expect(response.status()).toBe(200);
});
