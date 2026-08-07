import * as v from "valibot";

const zItem = v.object({
  id: v.pipe(v.string(), v.uuid()),
  value: v.string(),
});

const zData = v.object({
  ...zItem.entries,
  state: v.picklist(["deleted", "active"] as const),
  updatedAt: v.number(),
  sortOrder: v.number(),
});

export const zItems = v.array(zData);

export type Items = v.InferOutput<typeof zItems>;

export const zList = v.object({
  name: v.string(),
  new: v.optional(v.string()),
  // Not rendered as its own form field — only ever populated
  // programmatically by list.tsx's performRebaseSync, to carry every
  // addition queued during an offline session (see mutate_list migration
  // 20260806000000). `new` remains the single-value field for the everyday
  // online add.
  newItems: v.optional(v.array(v.string()), []),
  items: v.optional(v.array(zItem), []),
  themePrimary: v.optional(v.string()),
  themeSecondary: v.optional(v.string()),
});

export const sortData = (items: Items) => items.sort((a, b) => a.sortOrder - b.sortOrder);
