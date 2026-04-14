import { parseSubmission, report } from "@conform-to/react/future";

import { href } from "react-router";
import { redirectWithSuccess } from "remix-toast";
import * as v from "valibot";

import { resolveSlug, slugify } from "~/lib/slugify";
import { supabaseContext } from "~/lib/supabase.middleware";
import { requireUser } from "~/lib/supabase.server";
import type { Route } from "./+types/home";

import { ListItem, REORDER_LISTS_INTENT, zCreate, zReorderLists } from "./home.schema";

export async function loader({ context }: Route.LoaderArgs) {
  const supabase = context.get(supabaseContext);

  const user = await requireUser(supabase);
  const userId = user.id;

  const listsPromise = supabase
    .from("lists")
    .select("id, name, slug, user_id, list_items(updated_at, state)")
    .eq("state", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .then(async ({ data, error }) => {
      console.log("delay to remove!!!");
      await new Promise((resolve) => setTimeout(resolve, 1_500));

      if (error) {
        console.error("Error loading lists:", error);
        throw error;
      }
      return data;
    });

  const viewedAtMapPromise = supabase
    .from("list_views")
    .select("list_id, viewed_at")
    .eq("user_id", userId)
    .then(({ data, error }) => {
      if (error) {
        console.error("Error loading list views:", error);
        throw error;
      }

      return data ? Object.fromEntries(data.map((v) => [v.list_id, v.viewed_at])) : {};
    });

  return {
    userId,
    lists: Promise.all([listsPromise, viewedAtMapPromise]).then(([lists, viewedAtMap]) =>
      lists.map(({ list_items, ...list }) => {
        const activeItems = list_items.filter((item) => item.state === "active");
        return {
          ...list,
          totalCount: activeItems.length,
          unreadCount: activeItems.filter((item) => item.updated_at > (viewedAtMap[list.id] ?? 0))
            .length,
        } satisfies ListItem;
      }),
    ),
    waitlistCount: supabase
      .from("waitlist")
      .select("*", { count: "exact", head: true })
      .then(({ count }) => count ?? 0),
    // this is mostly here to satisfy the types in component
    revalidatePromise: Promise.resolve("server"),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();

  if (formData.get("intent") === REORDER_LISTS_INTENT) {
    const reorderPayload = {
      intent: formData.get("intent"),
      "list-order": formData.getAll("list-order"),
    };

    const reorderResult = v.safeParse(zReorderLists, reorderPayload);

    if (!reorderResult.success) {
      return null;
    }

    const supabase = context.get(supabaseContext);
    const user = await requireUser(supabase);

    const { data: ownedLists, error: listsError } = await supabase
      .from("lists")
      .select("id")
      .eq("user_id", user.id)
      .eq("state", "active");

    if (listsError) {
      console.error("Error loading owned lists for reorder:", listsError);
      return null;
    }

    const ownedSet = new Set((ownedLists ?? []).map(({ id }) => id));
    const ownedOrder = reorderResult.output["list-order"].filter((id) => ownedSet.has(id));

    if (ownedOrder.length === 0) {
      return null;
    }

    const updates = ownedOrder.map((id, sortOrder) =>
      supabase
        .from("lists")
        .update({ sort_order: sortOrder, updated_at: Date.now() })
        .eq("id", id)
        .eq("user_id", user.id)
        .eq("state", "active"),
    );

    const results = await Promise.all(updates);

    const failed = results.find(({ error }) => Boolean(error));
    if (failed?.error) {
      console.error("Error reordering lists:", failed.error);
    }

    return null;
  }

  const submission = parseSubmission(formData);

  const result = v.safeParse(zCreate, submission.payload);

  if (!result.success) {
    return report(submission);
  }

  const listName = result.output["new-list"];
  const baseSlug = slugify(listName);

  const supabase = context.get(supabaseContext);

  const user = await requireUser(supabase);

  const { data: userLists, error: userListsError } = await supabase
    .from("lists")
    .select("sort_order")
    .eq("user_id", user.id)
    .eq("state", "active");

  if (userListsError) {
    console.error("Error loading list sort order:", userListsError);
    return report(submission, {
      error: { formErrors: ["Failed to create list. Please try again."] },
    });
  }

  const nextSortOrder =
    Math.max(-1, ...(userLists ?? []).map((existingList) => existingList.sort_order)) + 1;

  const { data: matches } = await supabase
    .from("lists")
    .select("slug")
    .like("slug", `${baseSlug}%`)
    .eq("state", "active");

  const slug = resolveSlug(baseSlug, matches?.map((m: { slug: string }) => m.slug) ?? []);

  const { error } = await supabase.from("lists").insert({
    name: listName,
    slug,
    user_id: user.id,
    sort_order: nextSortOrder,
  });

  if (error) {
    console.error("Error creating list:", error);
    return report(submission, {
      error: { formErrors: ["Failed to create list. Please try again."] },
    });
  }

  return redirectWithSuccess(
    href("/lists/:list", { list: slug }),
    `List "${listName}" created successfully!`,
  );
}
