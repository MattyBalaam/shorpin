import { describe, expect, test } from "vitest";
import { rebaseListItems } from "./offline-merge";

describe("rebaseListItems", () => {
  test("a concurrent addition by another device survives", () => {
    const baseline = [{ id: "a", value: "Milk" }];
    const desired = [{ id: "a", value: "Milk" }];
    const fresh = [
      { id: "a", value: "Milk" },
      { id: "b", value: "Eggs" },
    ];

    expect(rebaseListItems({ baseline, desired, fresh })).toEqual([
      { id: "a", value: "Milk" },
      { id: "b", value: "Eggs" },
    ]);
  });

  test("a concurrent edit to an item we didn't touch: fresh wins", () => {
    const baseline = [{ id: "a", value: "Milk" }];
    const desired = [{ id: "a", value: "Milk" }];
    const fresh = [{ id: "a", value: "Milk 2%" }];

    expect(rebaseListItems({ baseline, desired, fresh })).toEqual([{ id: "a", value: "Milk 2%" }]);
  });

  test("a concurrent edit to an item we also edited: ours wins", () => {
    const baseline = [{ id: "a", value: "Milk" }];
    const desired = [{ id: "a", value: "Milk 2L" }];
    const fresh = [{ id: "a", value: "Milk (semi-skimmed)" }];

    expect(rebaseListItems({ baseline, desired, fresh })).toEqual([{ id: "a", value: "Milk 2L" }]);
  });

  test("our deletion beats a concurrent edit to the same item", () => {
    const baseline = [{ id: "a", value: "Milk" }];
    const desired: typeof baseline = [];
    const fresh = [{ id: "a", value: "Milk (semi-skimmed)" }];

    expect(rebaseListItems({ baseline, desired, fresh })).toEqual([]);
  });

  test("our own addition made while offline is appended", () => {
    const baseline = [{ id: "a", value: "Milk" }];
    const desired = [
      { id: "a", value: "Milk" },
      { id: "c", value: "Bread" },
    ];
    const fresh = [{ id: "a", value: "Milk" }];

    expect(rebaseListItems({ baseline, desired, fresh })).toEqual([
      { id: "a", value: "Milk" },
      { id: "c", value: "Bread" },
    ]);
  });

  test("our reorder applies to ids we know about; a concurrent addition keeps its fresh position", () => {
    const baseline = [
      { id: "a", value: "A" },
      { id: "b", value: "B" },
    ];
    const desired = [
      { id: "b", value: "B" },
      { id: "a", value: "A" },
    ];
    const fresh = [
      { id: "a", value: "A" },
      { id: "b", value: "B" },
      { id: "c", value: "C" },
    ];

    expect(rebaseListItems({ baseline, desired, fresh })).toEqual([
      { id: "b", value: "B" },
      { id: "a", value: "A" },
      { id: "c", value: "C" },
    ]);
  });

  test("no local changes and no remote changes: fresh order preserved verbatim", () => {
    const items = [
      { id: "a", value: "A" },
      { id: "b", value: "B" },
    ];

    expect(rebaseListItems({ baseline: items, desired: items, fresh: items })).toEqual(items);
  });
});
