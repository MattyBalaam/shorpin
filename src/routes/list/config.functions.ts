import { createServerFn } from "@tanstack/solid-start";
import * as v from "valibot";
import { authMiddleware, type SupaBaseContext } from "~/lib/supabase.middleware";

const NOT_OWNER = "Only the list owner can manage settings.";

/** The list, if it exists and the user owns it; else why not. */
async function findOwnedList(supabase: SupaBaseContext, userId: string, slug: string) {
  const { data, error } = await supabase
    .from("lists")
    .select("id, name, user_id")
    .eq("slug", slug)
    .eq("state", "active")
    .maybeSingle();

  if (error || !data) {
    if (error) console.error("Error loading list config:", error);
    return { ok: false as const, error: "List not found." };
  }
  if (data.user_id !== userId) return { ok: false as const, error: NOT_OWNER };
  return { ok: true as const, list: data };
}

/**
 * The config dialog's data: the list's name, and every other user with
 * whether they're a member. Not found or not the owner come back as an
 * error message for the page to show while it goes back to home (React
 * Router's loader threw a redirect that flashed it).
 */
export const getListConfig = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .validator(v.object({ slug: v.string() }))
  .handler(async ({ data: { slug }, context: { supabase, user } }) => {
    const found = await findOwnedList(supabase, user.id, slug);
    if (!found.ok) return found;
    const { list } = found;

    const [{ data: allProfiles }, { data: memberRows }] = await Promise.all([
      supabase.from("profiles").select("id, email").neq("id", user.id),
      supabase.from("list_members").select("user_id").eq("list_id", list.id),
    ]);

    const memberIds = new Set(memberRows?.map((member) => member.user_id) ?? []);
    const users = (allProfiles ?? []).map((profile) => ({
      id: profile.id,
      email: profile.email,
      isMember: memberIds.has(profile.id),
    }));

    return { ok: true as const, listName: list.name, users };
  });

const SAVE_FAILED = "Failed to update collaborators. Please try again.";

/** Makes exactly `memberIds` the list's collaborators. */
export const saveCollaborators = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(v.object({ slug: v.string(), memberIds: v.array(v.pipe(v.string(), v.uuid())) }))
  .handler(async ({ data: { slug, memberIds }, context: { supabase, user } }) => {
    const found = await findOwnedList(supabase, user.id, slug);
    if (!found.ok) return { ok: false as const, error: NOT_OWNER };
    const listId = found.list.id;

    const submittedIds = new Set(memberIds);
    const { data: currentRows } = await supabase
      .from("list_members")
      .select("user_id")
      .eq("list_id", listId);
    const currentIds = new Set(currentRows?.map((member) => member.user_id) ?? []);

    const toAdd = [...submittedIds].filter((id) => !currentIds.has(id));
    if (toAdd.length > 0) {
      const { error } = await supabase
        .from("list_members")
        .insert(toAdd.map((user_id) => ({ list_id: listId, user_id })));
      if (error) {
        console.error("Error adding list members:", error);
        return { ok: false as const, error: SAVE_FAILED };
      }
    }

    const toRemove = [...currentIds].filter((id) => !submittedIds.has(id));
    if (toRemove.length > 0) {
      const { error } = await supabase
        .from("list_members")
        .delete()
        .eq("list_id", listId)
        .in("user_id", toRemove);
      if (error) {
        console.error("Error removing list members:", error);
        return { ok: false as const, error: SAVE_FAILED };
      }
    }

    return { ok: true as const };
  });
