import { describe, expect, test } from "vitest";
import { slugify } from "./slugify";

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
