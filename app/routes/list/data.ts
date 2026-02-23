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

type Data = v.InferOutput<typeof zData>;

export const zItems = v.array(zData);

export type Items = v.InferOutput<typeof zItems>;

const zListData = v.object({
  name: v.string(),
  items: zItems,
});

type ListData = v.InferOutput<typeof zListData>;

export const zList = v.object({
  name: v.string(),
  new: v.optional(v.string()),
  items: v.fallback(v.array(zItem), []),
  themePrimary: v.optional(v.string()),
  themeSecondary: v.optional(v.string()),
});

type List = v.InferOutput<typeof zList>;

export const sortData = (items: Items) => items.sort((a, b) => a.sortOrder - b.sortOrder);
