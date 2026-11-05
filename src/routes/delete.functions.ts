import { notFound } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import * as v from "valibot";
import { authMiddleware } from "~/lib/supabase.middleware";

const NOT_OWNER = "Only the list owner can delete this list.";

/** The confirm page's data. Someone else's list comes back as an error. */
export const getDeleteTarget = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(v.object({ slug: v.string() }))
  .handler(async ({ data: { slug }, context: { supabase, user } }) => {
    const { data } = await supabase
      .from("lists")
      .select("name, user_id")
      .eq("slug", slug)
      .eq("state", "active")
      .maybeSingle();

    if (!data) throw notFound();
    if (data.user_id !== user.id) return { ok: false as const, error: NOT_OWNER };
    return { ok: true as const, listName: data.name };
  });

/** Soft-deletes the list. The page goes back to home itself. */
export const deleteList = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(v.object({ slug: v.string() }))
  .handler(async ({ data: { slug }, context: { supabase, user } }) => {
    const { data } = await supabase
      .from("lists")
      .select("user_id")
      .eq("slug", slug)
      .eq("state", "active")
      .maybeSingle();

    if (!data || data.user_id !== user.id) return { ok: false as const, error: NOT_OWNER };

    const { error } = await supabase
      .from("lists")
      .update({ state: "deleted", updated_at: Date.now() })
      .eq("slug", slug);

    if (error) {
      console.error("Error deleting list:", error);
      return { ok: false as const, error: "Failed to delete list. Please try again." };
    }
    return { ok: true as const };
  });
