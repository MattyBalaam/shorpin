import * as v from "valibot";

import { ListItem as ListItemDB } from "~/lib/supabase.middleware";

export const zCreate = v.object({
  "new-list": v.pipe(v.string(), v.minLength(1, "List name is required")),
});

export const REORDER_LISTS_INTENT = "reorder-lists";

export const zReorderLists = v.object({
  intent: v.literal(REORDER_LISTS_INTENT),
  "list-order": v.array(v.pipe(v.string(), v.uuid())),
});

export type ListItem = Pick<ListItemDB, "id" | "name" | "slug" | "user_id"> & {
  unreadCount: number;
  totalCount: number;
};
