import * as v from "valibot";

import { appStyles, type AppStyle } from "~/lib/app-style";

import { ListItem as ListItemDB } from "~/lib/supabase.middleware";

export const zCreate = v.object({
  "new-list": v.pipe(v.string(), v.minLength(1, "List name is required")),
});

export const REORDER_LISTS_INTENT = "reorder-lists";

export const zReorderLists = v.object({
  intent: v.literal(REORDER_LISTS_INTENT),
  "list-order": v.array(v.pipe(v.string(), v.uuid())),
});

export const SET_DEFAULT_LIST_INTENT = "set-default-list";

export const zSetDefaultList = v.object({
  intent: v.literal(SET_DEFAULT_LIST_INTENT),
  // Empty string clears the default.
  "list-id": v.union([v.literal(""), v.pipe(v.string(), v.uuid())]),
});

export const SET_APP_STYLE_INTENT = "set-app-style";

export const zSetAppStyle = v.object({
  intent: v.literal(SET_APP_STYLE_INTENT),
  "app-style": v.picklist(Object.keys(appStyles) as AppStyle[]),
});

export type ListItem = Pick<ListItemDB, "id" | "name" | "slug" | "user_id"> & {
  unreadCount: number;
  totalCount: number;
  /** Client-only: created offline, not yet confirmed by the server. */
  pending?: boolean;
};
