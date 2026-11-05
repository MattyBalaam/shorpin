import { expect, test } from "@playwright/test";

// The server routes with no page: what the Dockerfile's health check, CI's
// deploy check and version-guard, and the perf beacon rely on.

test("health answers ok", async ({ request }) => {
  const response = await request.get("/health");
  expect(response.status()).toBe(200);
  expect(await response.text()).toBe("ok");
  expect(response.headers()["x-health-duration"]).toMatch(/^\d+ms$/);
});

test("version reports the build's git details", async ({ request }) => {
  const response = await request.get("/version");
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toMatchObject({ hash: expect.any(String), shortHash: expect.any(String) });
  expect(body.shortHash).toBe(body.hash.slice(0, 7));
});

test("perf accepts metrics, and junk, with a 204", async ({ request }) => {
  const metric = { kind: "web-vital", name: "LCP", value: 1200, unit: "ms", pathname: "/" };
  expect((await request.post("/perf", { data: metric })).status()).toBe(204);
  expect((await request.post("/perf", { data: "not json" })).status()).toBe(204);
});

test("perf refuses GET", async ({ request }) => {
  expect((await request.get("/perf")).status()).toBe(405);
});
