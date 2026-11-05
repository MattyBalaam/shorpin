import { describe, expect, test } from "vitest";
import { formatItemTag, groupByTag, listTags, parseItemTag, withPickedTag } from "./item-tag";

describe("parseItemTag", () => {
  test("splits a trailing tag from the text", () => {
    expect(parseItemTag("Milk [dairy]")).toEqual({ text: "Milk", tag: "dairy" });
  });

  test("allows no space before the tag", () => {
    expect(parseItemTag("Milk[dairy]")).toEqual({ text: "Milk", tag: "dairy" });
  });

  test("trims whitespace inside the brackets", () => {
    expect(parseItemTag("Milk [ dairy ] ")).toEqual({ text: "Milk", tag: "dairy" });
  });

  test("returns no tag for an untagged value", () => {
    expect(parseItemTag("Milk")).toEqual({ text: "Milk", tag: null });
  });

  test("only treats the last bracket group as the tag", () => {
    expect(parseItemTag("Batteries [AA] [hardware]")).toEqual({
      text: "Batteries [AA]",
      tag: "hardware",
    });
  });

  test("ignores brackets that aren't at the end", () => {
    expect(parseItemTag("Call [Sam] tomorrow")).toEqual({
      text: "Call [Sam] tomorrow",
      tag: null,
    });
  });

  test("keeps a bracket-only or empty-tag value as typed", () => {
    expect(parseItemTag("[dairy]")).toEqual({ text: "[dairy]", tag: null });
    expect(parseItemTag("Milk []")).toEqual({ text: "Milk []", tag: null });
  });

  test("keeps multi-line text", () => {
    expect(parseItemTag("Line one\nline two [notes]")).toEqual({
      text: "Line one\nline two",
      tag: "notes",
    });
  });
});

describe("formatItemTag", () => {
  test("appends the tag in brackets", () => {
    expect(formatItemTag("Milk", "dairy")).toBe("Milk [dairy]");
  });

  test("omits an empty tag", () => {
    expect(formatItemTag("Milk ", " ")).toBe("Milk");
    expect(formatItemTag("Milk", null)).toBe("Milk");
  });

  test("strips brackets from the tag", () => {
    expect(formatItemTag("Milk", "[dairy]")).toBe("Milk [dairy]");
  });

  test("round-trips through parseItemTag", () => {
    const { text, tag } = parseItemTag(formatItemTag("Eggs", "fridge"));
    expect(formatItemTag(text, tag)).toBe("Eggs [fridge]");
  });
});

describe("groupByTag", () => {
  const item = (id: string, value: string) => ({ id, value });

  test("gathers each tag's items at its first item's position", () => {
    const items = [
      item("1", "Milk"),
      item("2", "Cheese [dairy]"),
      item("3", "Apples [fruit]"),
      item("4", "Bread"),
      item("5", "Yogurt [dairy]"),
      item("6", "Bananas [fruit]"),
    ];
    expect(groupByTag(items)).toEqual(["1", "4", "2", "5", "3", "6"]);
  });

  test("leaves a grouped list unchanged", () => {
    const items = [item("1", "Cheese [dairy]"), item("2", "Yogurt [dairy]"), item("3", "Milk")];
    expect(groupByTag(items)).toEqual(["1", "2", "3"]);
  });
});

describe("listTags", () => {
  test("lists each tag once, alphabetically", () => {
    const items = ["Milk [dairy]", "Apples [fruit]", "Bread", "Cheese [dairy]"].map((value) => ({
      value,
    }));
    expect(listTags(items)).toEqual(["dairy", "fruit"]);
  });
});

describe("withPickedTag", () => {
  test("adds the picked tag", () => {
    expect(withPickedTag("Cheese", "dairy")).toBe("Cheese [dairy]");
  });

  test("keeps a tag typed into the value", () => {
    expect(withPickedTag("Cheese [deli]", "dairy")).toBe("Cheese [deli]");
  });

  test("leaves the value alone with no tag picked, or nothing typed", () => {
    expect(withPickedTag("Cheese", "")).toBe("Cheese");
    expect(withPickedTag("", "dairy")).toBe("");
  });
});
