import { notFound } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import * as v from "valibot";
import { isAppStyle } from "~/lib/app-style";
import { SERVICE_UNAVAILABLE } from "~/lib/network-error";
import { authMiddleware } from "~/lib/supabase.middleware";
import { type Items, sortData, zItems, zList } from "./data";

const zMutateListRpcResult = v.union([
  v.object({
    ok: v.literal(true),
    listId: v.pipe(v.string(), v.uuid()),
    hasItemMutation: v.boolean(),
    items: zItems,
  }),
  v.object({
    ok: v.literal(false),
    reason: v.literal("not_found"),
  }),
]);

/**
 * Sends an add that carries a client-generated id (see `newId` in data.ts) as
 * a `newItems`/`newItemIds` entry rather than `new`, so mutate_list uses that
 * id for the row and a replay of the same add is a no-op (migration
 * 20261011000000) instead of a duplicate. No migration needed: `new` stays
 * the fallback for any client that doesn't send an id.
 */
function toIdempotentAdd({ newId, ...payload }: v.InferOutput<typeof zList>) {
  if (!payload.new || !newId || payload.newItems.length !== payload.newItemIds.length) {
    return payload;
  }
  return {
    ...payload,
    new: "",
    newItems: [...payload.newItems, payload.new],
    newItemIds: [...payload.newItemIds, newId],
  };
}

export const getList = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(
    v.object({
      slug: v.string(),
      // Whether this load is a visit: opening the list. A refetch from the
      // page itself (another member's change, the reconnect sync) isn't, and
      // recording one would clear unread too soon. React Router told them
      // apart by the Referer, but TanStack Router updates the URL before
      // loading, so the Referer of a visit can already be the list's.
      recordVisit: v.boolean(),
    }),
  )
  .handler(async ({ data: { slug, recordVisit }, context: { supabase, user } }) => {
    const { data, error } = await supabase
      .from("lists")
      .select("id, name, slug, theme_primary, theme_secondary, theme_style, list_items(*)")
      .eq("slug", slug)
      .eq("state", "active")
      .order("sort_order", { referencedTable: "list_items", ascending: true })
      .maybeSingle();

    if (error || !data) {
      if (error) console.error("Error loading list:", error);

      // Network/connectivity errors (e.g. Supabase unreachable) should not
      // masquerade as 404s, so the client can fall back to its cache.
      if (error && !error.code && error.message?.includes("fetch")) {
        throw new Error(SERVICE_UNAVAILABLE);
      }

      throw notFound();
    }

    const { data: listView, error: listViewError } = await supabase
      .from("list_views")
      .select("viewed_at")
      .eq("list_id", data.id)
      .eq("user_id", user.id)
      .order("viewed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (listViewError) {
      console.error("Error loading list view:", listViewError);
      throw listViewError;
    }

    const lastViewedAt = listView?.viewed_at ?? 0;

    if (recordVisit) {
      const viewedAt = Date.now();
      const { error: viewError } = listView
        ? await supabase
            .from("list_views")
            .update({ viewed_at: viewedAt })
            .eq("list_id", data.id)
            .eq("user_id", user.id)
        : await supabase
            .from("list_views")
            .insert({ list_id: data.id, user_id: user.id, viewed_at: viewedAt });

      if (viewError) {
        console.error("Error recording list view:", viewError);
        throw viewError;
      }
    }

    const items = data.list_items.map((item) => ({
      id: item.id,
      value: item.value,
      state: item.state,
      updatedAt: item.updated_at,
      sortOrder: item.sort_order,
    })) satisfies Items;

    return {
      name: data.name,
      items: items
        .filter(({ state }) => state === "active")
        .map(({ id, value }) => ({ id, value })),
      themePrimary: data.theme_primary ?? undefined,
      themeSecondary: data.theme_secondary ?? undefined,
      listId: data.id,
      // Read by root to style the whole page (see useEffectiveAppStyle).
      appStyleOverride: isAppStyle(data.theme_style) ? data.theme_style : null,
      newItemIds: items
        .filter(({ state, updatedAt }) => state === "active" && updatedAt > lastViewedAt)
        .map(({ id }) => id),
    };
  });

export type ListData = Awaited<ReturnType<typeof getList>>;

/**
 * Saves the list's whole desired state; mutate_list diffs it against the
 * database (see the migrations). Returns the saved items, so the page can
 * take them as the new truth without refetching.
 *
 * React Router's action took FormData and answered with a Conform
 * submission result. A server function takes the validated object itself,
 * and returns plain data — or throws, which the page turns into a queued
 * offline edit or an error toast.
 */
export const mutateList = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(
    v.object({
      slug: v.string(),
      clientId: v.string(),
      payload: zList,
    }),
  )
  .handler(async ({ data: { slug, clientId, payload }, context: { supabase } }) => {
    const { data: rpcData, error: rpcError } = await supabase.rpc("mutate_list", {
      p_list_slug: slug,
      p_payload: toIdempotentAdd(payload),
      p_mutated_at: Date.now(),
    });

    if (rpcError) {
      console.error("Error mutating list:", rpcError);
      throw new Error("Failed to update list. Please try again.");
    }

    const rpcResult = v.safeParse(zMutateListRpcResult, rpcData);
    if (!rpcResult.success) {
      console.error("Unexpected mutate_list payload:", rpcData);
      throw new Error("Failed to update list. Please try again.");
    }
    if (!rpcResult.output.ok) throw notFound();

    // Broadcast change to other clients (fire-and-forget)
    const channel = supabase.channel(`list-${rpcResult.output.listId}`);
    void channel.httpSend("changed", { clientId }).finally(() => supabase.removeChannel(channel));

    return {
      items: sortData(rpcResult.output.items.filter(({ state }) => state === "active")).map(
        ({ id, value }) => ({ id, value }),
      ),
    };
  });
