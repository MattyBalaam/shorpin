import { z } from "zod/v4";

const zItem = z.object({
  id: z.uuid(),
  value: z.string(),
});

const zData = zItem.extend({
  state: z.enum(["deleted", "active"] as const),
  updatedAt: z.number(),
  sortOrder: z.number(),
});

type Data = z.infer<typeof zData>;

export const zItems = z.array(zData);

export type Items = z.infer<typeof zItems>;

const zListData = z.object({
  name: z.string(),
  items: zItems,
});

type ListData = z.infer<typeof zListData>;

export const zList = z.object({
  name: z.string(),
  new: z.string().optional(),
  items: z.array(zItem).default([]),
  themePrimary: z.string().optional(),
  themeSecondary: z.string().optional(),
});

type List = z.infer<typeof zList>;

export const sortData = (items: Items) =>
  items.sort((a, b) => a.sortOrder - b.sortOrder);
