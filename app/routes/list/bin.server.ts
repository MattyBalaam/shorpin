import { href } from "react-router";
import { redirectWithError } from "remix-toast";
import { supabaseContext } from "~/lib/supabase.middleware";
import type { Route } from "./+types/bin";

// mutate_list keeps a list's 10 most recently deleted items and drops the
// rest, so this is the whole bin: no paging.
const BIN_SIZE = 10;

/**
 * The list's deleted items, newest first. Any member may read them (the
 * "members can select list_items" policy).
 *
 * Undelete re-adds a value as a new item and leaves the deleted row behind,
 * so values that are on the list again are left out (a second click would
 * add them twice), and a value deleted more than once shows once.
 */
export async function loader({ params: { list }, context }: Route.LoaderArgs) {
  const supabase = context.get(supabaseContext);

  const { data: listData, error: listError } = await supabase
    .from("lists")
    .select("id")
    .eq("slug", list)
    .eq("state", "active")
    .maybeSingle();

  if (listError || !listData) {
    if (listError) console.error("Error loading list for bin:", listError);
    throw redirectWithError(href("/"), "List not found.");
  }

  const [deleted, active] = await Promise.all([
    supabase
      .from("list_items")
      .select("id, value, updated_at")
      .eq("list_id", listData.id)
      .eq("state", "deleted")
      .order("updated_at", { ascending: false })
      .limit(BIN_SIZE),
    supabase.from("list_items").select("value").eq("list_id", listData.id).eq("state", "active"),
  ]);

  if (deleted.error || active.error) {
    console.error("Error loading bin:", deleted.error ?? active.error);
    throw redirectWithError(
      href("/lists/:list", { list }),
      "Couldn't load the bin. Please try again.",
    );
  }

  const hidden = new Set(active.data.map(({ value }) => value));
  const items = deleted.data.flatMap(({ id, value }) => {
    if (hidden.has(value)) return [];
    hidden.add(value);
    return [{ id, value }];
  });

  return { items };
}
