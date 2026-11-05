import * as v from "valibot";

import { ListItem as ListItemDB } from "~/lib/supabase.middleware";

export const zCreate = v.object({
  "new-list": v.pipe(v.string(), v.minLength(1, "List name is required")),
});

export type ListItem = Pick<ListItemDB, "id" | "name" | "slug" | "user_id"> & {
  unreadCount: number;
  totalCount: number;
  /** Client-only: created offline, not yet confirmed by the server. */
  pending?: boolean;
};
