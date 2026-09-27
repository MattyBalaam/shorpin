import { describe, expect, test } from "vitest";
import {
  DEFAULT_LIST_COOKIE,
  isLaunchUrl,
  readDefaultListId,
  serializeDefaultListCookie,
} from "./default-list";

const id = "0b8f2d3e-4c5a-4b6d-8e9f-0a1b2c3d4e5f";

describe("readDefaultListId", () => {
  test("reads the id among other cookies", () => {
    expect(readDefaultListId(`sb-auth=abc; ${DEFAULT_LIST_COOKIE}=${id}; other=1`)).toBe(id);
  });

  test("returns null when absent, empty, or not a uuid", () => {
    expect(readDefaultListId(null)).toBeNull();
    expect(readDefaultListId("other=1")).toBeNull();
    expect(readDefaultListId(`${DEFAULT_LIST_COOKIE}=`)).toBeNull();
    expect(readDefaultListId(`${DEFAULT_LIST_COOKIE}=nope`)).toBeNull();
  });

  test("round-trips through serializeDefaultListCookie", () => {
    const [pair] = serializeDefaultListCookie(id).split(";");
    expect(readDefaultListId(pair)).toBe(id);
  });
});

describe("serializeDefaultListCookie", () => {
  test("sets a long-lived cookie", () => {
    expect(serializeDefaultListCookie(id)).toMatch(/Max-Age=34560000/);
  });

  test("expires the cookie when cleared", () => {
    expect(serializeDefaultListCookie(null)).toMatch(/Max-Age=0/);
  });
});

test("isLaunchUrl", () => {
  expect(isLaunchUrl(new URL("https://x.test/?launch"))).toBe(true);
  expect(isLaunchUrl(new URL("https://x.test/"))).toBe(false);
});
