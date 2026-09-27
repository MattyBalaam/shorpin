import { parseSubmission, report } from "@conform-to/react/future";

import { data, href, redirect } from "react-router";
import { redirectWithSuccess } from "remix-toast";
import * as v from "valibot";

import { isLaunchUrl, readDefaultListId, serializeDefaultListCookie } from "~/lib/default-list";
import { resolveSlug, slugify } from "~/lib/slugify";
import { type SupaBaseContext, supabaseContext } from "~/lib/supabase.middleware";
import { requireUser } from "~/lib/supabase.server";
import type { Route } from "./+types/home";

import {
  ListItem,
  REORDER_LISTS_INTENT,
  SET_DEFAULT_LIST_INTENT,
  zCreate,
  zReorderLists,
  zSetDefaultList,
} from "./home.schema";

// PWA launches (manifest start_url) always redirect away from `/?launch` —
// into the starred list if there is one, otherwise to plain `/` — so a later
// revalidation of home never re-triggers the launch redirect.
async function launchRedirect(supabase: SupaBaseContext, id: string | null) {
  if (!id) return redirect(href("/"));

  const { data: list } = await supabase
    .from("lists")
    .select("slug")
    .eq("id", id)
    .eq("state", "active")
    .maybeSingle();

  // Re-issuing the cookie on each launch keeps it server-set (not subject to
  // Safari's 7-day cap on script-written storage) and slides its expiry.
  return redirect(list ? href("/lists/:list", { list: list.slug }) : href("/"), {
    headers: { "Set-Cookie": serializeDefaultListCookie(list ? id : null) },
  });
}

export async function loader({ request, context }: Route.LoaderArgs) {
  const supabase = context.get(supabaseContext);

  const user = await requireUser(supabase);
  const userId = user.id;
  const defaultListId = readDefaultListId(request.headers.get("Cookie"));

  if (isLaunchUrl(new URL(request.url))) {
    throw await launchRedirect(supabase, defaultListId);
  }

  const listsPromise = supabase
    .from("lists")
    .select("id, name, slug, user_id, updated_at,list_items(updated_at, state)")
    .eq("state", "active")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false })
    .then(async ({ data, error }) => {
      if (error) {
        console.error("Error loading lists:", error);
        throw error;
      }

      return data.map((list) => ({
        ...list,
        list_items: list.list_items.filter((item) => item.state === "active"),
      }));
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
    defaultListId,
    lists: Promise.all([listsPromise, viewedAtMapPromise]).then(([lists, viewedAtMap]) =>
      lists.map(({ list_items, ...list }) => {
        return {
          ...list,
          totalCount: list_items.length,
          unreadCount: list_items.filter((item) => item.updated_at > (viewedAtMap[list.id] ?? 0))
            .length,
        } satisfies ListItem;
      }),
    ),
    // create a sum of the updated_at timestamps of all lists as a simple way to detect changes without needing a separate "updatedKey" field in the database
    updatedKey: Promise.all([listsPromise, viewedAtMapPromise]).then(([lists, viewedAtMap]) => {
      return lists.reduce((max, list) => max + list.updated_at + (viewedAtMap[list.id] ?? 0), 0);
    }),
    waitlistCount: (async () =>
      (await supabase.from("waitlist").select("*", { count: "exact", head: true })).count ?? 0)(),
    // this is mostly here to satisfy the types in component
    revalidatePromise: Promise.resolve("stale" as const),
  };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();

  if (formData.get("intent") === SET_DEFAULT_LIST_INTENT) {
    const result = v.safeParse(zSetDefaultList, Object.fromEntries(formData));
    if (!result.success) return null;

    const listId = result.output["list-id"] || null;
    return data(null, { headers: { "Set-Cookie": serializeDefaultListCookie(listId) } });
  }

  if (formData.get("intent") === REORDER_LISTS_INTENT) {
    const reorderPayload = {
      intent: formData.get("intent"),
      "list-order": formData.getAll("list-order"),
    };

    const reorderResult = v.safeParse(zReorderLists, reorderPayload);

    console.log("Reorder validation result:", reorderResult);

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
