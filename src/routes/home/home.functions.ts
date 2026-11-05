import { createServerFn } from "@tanstack/solid-start";
import { authMiddleware } from "~/lib/supabase.middleware";
import type { ListItem } from "./home.schema";

// Not yet ported (see legacy/README.md): creating and reordering lists, the
// starred launch list, and streaming the slower parts of this payload.
export const getHome = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context: { supabase, user } }) => {
    const [listsResult, viewsResult, waitlistResult] = await Promise.all([
      supabase
        .from("lists")
        .select("id, name, slug, user_id, updated_at, list_items(updated_at, state)")
        .eq("state", "active")
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false }),
      supabase.from("list_views").select("list_id, viewed_at").eq("user_id", user.id),
      supabase.from("waitlist").select("*", { count: "exact", head: true }),
    ]);

    if (listsResult.error) throw listsResult.error;
    if (viewsResult.error) throw viewsResult.error;

    const viewedAt = Object.fromEntries(viewsResult.data.map((v) => [v.list_id, v.viewed_at]));

    const lists = listsResult.data.map(({ list_items, updated_at: _updatedAt, ...list }) => {
      const active = list_items.filter((item) => item.state === "active");
      return {
        ...list,
        totalCount: active.length,
        unreadCount: active.filter((item) => item.updated_at > (viewedAt[list.id] ?? 0)).length,
      } satisfies ListItem;
    });

    return { userId: user.id, lists, waitlistCount: waitlistResult.count ?? 0 };
  });
