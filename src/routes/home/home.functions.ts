import { createServerFn } from "@tanstack/solid-start";
import { getCookie, setCookie } from "@tanstack/solid-start/server";
import * as v from "valibot";
import {
  DEFAULT_LIST_COOKIE,
  defaultListCookieOptions,
  parseDefaultListId,
} from "~/lib/default-list";
import { resolveSlug, slugify } from "~/lib/slugify";
import { authMiddleware } from "~/lib/supabase.middleware";
import { type ListItem, zCreate } from "./home.schema";

// Postgres unique_violation, surfaced by PostgREST as `error.code`.
const UNIQUE_VIOLATION = "23505";

const CREATE_FAILED = "Failed to create list. Please try again.";

function setDefaultListCookie(listId: string | null) {
  setCookie(DEFAULT_LIST_COOKIE, listId ?? "", {
    ...defaultListCookieOptions,
    ...(listId ? {} : { maxAge: 0 }),
  });
}

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

    return {
      userId: user.id,
      lists,
      defaultListId: parseDefaultListId(getCookie(DEFAULT_LIST_COOKIE)),
      waitlistCount: waitlistResult.count ?? 0,
    };
  });

export type HomeData = Awaited<ReturnType<typeof getHome>>;

/**
 * Where an installed app's launch (`/?launch`) should land: the starred
 * list, if it still exists. Re-issuing the cookie on each launch keeps it
 * server-set (not subject to Safari's 7-day cap on script-written storage)
 * and slides its expiry.
 */
export const getLaunchTarget = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context: { supabase } }) => {
    const id = parseDefaultListId(getCookie(DEFAULT_LIST_COOKIE));
    if (!id) return { slug: null };

    const { data: list } = await supabase
      .from("lists")
      .select("slug")
      .eq("id", id)
      .eq("state", "active")
      .maybeSingle();

    setDefaultListCookie(list ? id : null);
    return { slug: list?.slug ?? null };
  });

/** Stars a list to open on launch, or clears the star with null. */
export const setDefaultList = createServerFn({ method: "POST" })
  .validator(v.object({ listId: v.nullable(v.pipe(v.string(), v.uuid())) }))
  .handler(({ data: { listId } }) => {
    setDefaultListCookie(listId);
  });

/**
 * Creates a list and returns its slug, or a form error. The page moves into
 * the new list itself: React Router's action answered with a redirect.
 */
export const createList = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zCreate)
  .handler(async ({ data, context: { supabase, user } }) => {
    const listName = data["new-list"];
    const baseSlug = slugify(listName);

    const { data: userLists, error: userListsError } = await supabase
      .from("lists")
      .select("sort_order")
      .eq("user_id", user.id)
      .eq("state", "active");

    if (userListsError) {
      console.error("Error loading list sort order:", userListsError);
      return { ok: false as const, formError: CREATE_FAILED };
    }

    const nextSortOrder =
      Math.max(-1, ...(userLists ?? []).map((existingList) => existingList.sort_order)) + 1;

    // `lists.slug` is unique across every row, including soft-deleted lists,
    // so don't filter by state here.
    const { data: matches } = await supabase
      .from("lists")
      .select("slug")
      .like("slug", `${baseSlug}%`);

    let slug = resolveSlug(baseSlug, matches?.map((m: { slug: string }) => m.slug) ?? []);

    const insertList = (candidate: string) =>
      supabase.from("lists").insert({
        name: listName,
        slug: candidate,
        user_id: user.id,
        sort_order: nextSortOrder,
      });

    let { error } = await insertList(slug);

    // RLS hides other users' lists from the lookup above, so the slug can
    // still collide. Fall back to a random suffix rather than probing
    // sequentially.
    for (let attempt = 0; error?.code === UNIQUE_VIOLATION && attempt < 3; attempt++) {
      slug = `${baseSlug}-${crypto.randomUUID().slice(0, 6)}`;
      ({ error } = await insertList(slug));
    }

    if (error) {
      console.error("Error creating list:", error);
      return { ok: false as const, formError: CREATE_FAILED };
    }

    return { ok: true as const, slug, name: listName };
  });

/** Saves the order of the lists the user owns; others' lists are skipped. */
export const reorderLists = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(v.object({ order: v.array(v.pipe(v.string(), v.uuid())) }))
  .handler(async ({ data: { order }, context: { supabase, user } }) => {
    const { data: ownedLists, error: listsError } = await supabase
      .from("lists")
      .select("id")
      .eq("user_id", user.id)
      .eq("state", "active");

    if (listsError) {
      console.error("Error loading owned lists for reorder:", listsError);
      throw new Error("Failed to save the order of your lists");
    }

    const ownedSet = new Set((ownedLists ?? []).map(({ id }) => id));
    const ownedOrder = order.filter((id) => ownedSet.has(id));

    const results = await Promise.all(
      ownedOrder.map((id, sortOrder) =>
        supabase
          .from("lists")
          .update({ sort_order: sortOrder, updated_at: Date.now() })
          .eq("id", id)
          .eq("user_id", user.id)
          .eq("state", "active"),
      ),
    );

    const failed = results.find(({ error }) => Boolean(error));
    if (failed?.error) {
      console.error("Error reordering lists:", failed.error);
      throw new Error("Failed to save the order of your lists");
    }
  });
