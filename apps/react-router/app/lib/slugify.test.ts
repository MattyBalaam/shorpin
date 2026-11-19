import { describe, expect, test } from "vitest";
import { slugify, resolveSlug } from "./slugify";

describe("slugify", () => {
  test("converts spaces and slashes to hyphens", () => {
    expect(slugify("Tasks / bugs here")).toBe("tasks-bugs-here");
  });

  test("converts to lowercase", () => {
    expect(slugify("My Shopping List")).toBe("my-shopping-list");
  });

  test("strips accented characters", () => {
    expect(slugify("Café items")).toBe("cafe-items");
  });

  test("trims and collapses whitespace", () => {
    expect(slugify("  hello  world  ")).toBe("hello-world");
  });

  test("preserves already-valid slugs", () => {
    expect(slugify("already-a-slug")).toBe("already-a-slug");
  });

  test("handles numbers", () => {
    expect(slugify("List 42")).toBe("list-42");
  });

  test("handles empty string", () => {
    expect(slugify("")).toBe("");
  });

  test("handles only special characters", () => {
    expect(slugify("@#$%")).toBe("");
  });
});

describe("resolveSlug", () => {
  test("returns base slug when no collisions", () => {
    expect(resolveSlug("shopping", [])).toBe("shopping");
  });

  test("returns base slug when existing slugs don't match", () => {
    expect(resolveSlug("shopping", ["groceries", "todo"])).toBe("shopping");
  });

  test("appends -1 on first collision", () => {
    expect(resolveSlug("shopping", ["shopping"])).toBe("shopping-1");
  });

  test("appends -2 when -1 is also taken", () => {
    expect(resolveSlug("shopping", ["shopping", "shopping-1"])).toBe("shopping-2");
  });

  test("finds next available suffix with gaps", () => {
    expect(resolveSlug("shopping", ["shopping", "shopping-1", "shopping-2"])).toBe("shopping-3");
  });

  test("ignores unrelated slugs with same prefix", () => {
    expect(resolveSlug("shop", ["shop", "shopping"])).toBe("shop-1");
  });
});
