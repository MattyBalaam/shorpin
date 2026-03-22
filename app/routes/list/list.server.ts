import { parseSubmission, report } from "@conform-to/react/future";

import { dataWithError } from "remix-toast";
import * as v from "valibot";
import { supabaseContext } from "~/lib/supabase.middleware";
import { requireUser } from "~/lib/supabase.server";
import type { Route } from "./+types/list";
import { type Items, sortData, zItems, zList } from "./data";
import { isAddItemIntent } from "./intents";

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

export async function loader({ request, params: { list }, context }: Route.LoaderArgs) {
  const supabase = context.get(supabaseContext);
  const user = await requireUser(supabase);

  const { data, error } = await supabase
    .from("lists")
    .select("id, name, slug, theme_primary, theme_secondary, list_items(*)")
    .eq("slug", list)
    .eq("state", "active")
    .order("sort_order", { referencedTable: "list_items", ascending: true })
    .single();

  if (error || !data) {
    if (error) console.error("Error loading list:", error);

    // Network/connectivity errors (e.g. Supabase unreachable) should not
    // masquerade as 404s — throw 503 so the client can distinguish them.
    if (error && !error.code && error.message?.includes("fetch")) {
      throw new Response("Service unavailable", { status: 503 });
    }

    throw await dataWithError(
      {
        message: error
          ? error.code === "PGRST116"
            ? "List does not exist"
            : error.message
          : "unknown error",
      },
      "List does not exist",
      { status: 404 },
    );
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

  const referer = request.headers.get("referer");
  const isSameListRevalidation = (() => {
    if (!referer) {
      return false;
    }

    try {
      return new URL(referer).pathname === `/lists/${list}`;
    } catch {
      return false;
    }
  })();

  // Record that this user viewed the list on entry, but avoid writing on same-page
  // revalidation after actions (e.g. adding an item), which would clear unread too soon.
  if (!isSameListRevalidation) {
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
    defaultValue: {
      name: data.name,
      items: items.filter(({ state }) => state === "active"),
      themePrimary: data.theme_primary ?? undefined,
      themeSecondary: data.theme_secondary ?? undefined,
    },
    listId: data.id,
    newItemIds: items
      .filter(({ state, updatedAt }) => state === "active" && updatedAt > lastViewedAt)
      .map(({ id }) => id),
    lastDeleted: items.filter(({ state }) => state === "deleted").at(-1),
  };
}

export async function action({ request, params: { list }, context }: Route.ActionArgs) {
  const updatedAt = Date.now();

  const formData = await request.formData();

  const submission = parseSubmission(formData);

  const result = v.safeParse(zList, submission.payload);

  if (!result.success) {
    return {
      result: report(submission, {
        error: {
          issues: result.issues,
        },
      }),
    };
  }

  const supabase = context.get(supabaseContext);
  await requireUser(supabase);

  const { data: rpcData, error: rpcError } = await supabase.rpc("mutate_list", {
    p_list_slug: list,
    p_payload: result.output,
    p_intent: submission.intent ?? null,
    p_mutated_at: updatedAt,
  });

  if (rpcError) {
    console.error("Error mutating list:", rpcError);
    return {
      result: report(submission, {
        error: {
          issues: [{ message: "Failed to update list. Please try again." }],
        },
      }),
    };
  }

  const rpcResult = v.safeParse(zMutateListRpcResult, rpcData);

  if (!rpcResult.success) {
    console.error("Unexpected mutate_list payload:", rpcData);
    return {
      result: report(submission, {
        error: {
          issues: [{ message: "Failed to update list. Please try again." }],
        },
      }),
    };
  }

  if (!rpcResult.output.ok) {
    return {
      result: report(submission, {
        error: {
          issues: [{ message: "List not found" }],
        },
      }),
    };
  }

  const toAdd = isAddItemIntent(result.output["new-submit"]);

  const allItems = rpcResult.output.items;

  // Broadcast change to other clients (fire-and-forget)
  const clientId = formData.get("clientId");
  const channel = supabase.channel(`list-${rpcResult.output.listId}`);
  void channel.httpSend("changed", { clientId }).finally(() => supabase.removeChannel(channel));

  return {
    lastDeleted: sortData(allItems.filter(({ state }) => state === "deleted")).at(-1),
    lastResult: report(submission, {
      reset: toAdd && Boolean(result.output.new),
      value: {
        ...result.output,
        new: toAdd ? "" : (result.output.new ?? ""),
        items: sortData(allItems.filter(({ state }) => state === "active")).map((item) => ({
          id: item.id,
          value: item.value,
        })),
      },
    }),
  };
}
