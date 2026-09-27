import { describe, expect, test } from "vitest";
import { isLaunchUrl, readDefaultListId, serializeDefaultListCookie } from "./default-list";

const id = "0b8f2d3e-4c5a-4b6d-8e9f-0a1b2c3d4e5f";

// Only the `name=value` pair of a Set-Cookie is what the browser sends back.
async function roundTrip(listId: string | null) {
  const [pair] = (await serializeDefaultListCookie(listId)).split(";");
  return readDefaultListId(`sb-auth=abc; ${pair}; other=1`);
}

describe("readDefaultListId", () => {
  test("round-trips a list id among other cookies", async () => {
    expect(await roundTrip(id)).toBe(id);
  });

  test("returns null when absent, cleared, or not a uuid", async () => {
    expect(await readDefaultListId(null)).toBeNull();
    expect(await readDefaultListId("other=1")).toBeNull();
    expect(await roundTrip(null)).toBeNull();
    expect(await roundTrip("nope")).toBeNull();
  });
});

describe("serializeDefaultListCookie", () => {
  test("sets a long-lived cookie", async () => {
    expect(await serializeDefaultListCookie(id)).toMatch(/Max-Age=34560000/);
  });

  test("expires the cookie when cleared", async () => {
    expect(await serializeDefaultListCookie(null)).toMatch(/Max-Age=0/);
  });
});

test("isLaunchUrl", () => {
  expect(isLaunchUrl(new URL("https://x.test/?launch"))).toBe(true);
  expect(isLaunchUrl(new URL("https://x.test/"))).toBe(false);
});
