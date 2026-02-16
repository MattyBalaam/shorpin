import type { Route } from "./+types/delete";

import { redirectWithSuccess } from "remix-toast";
import { supabase } from "~/lib/supabase.server";

export async function action({ params: { list } }: Route.ActionArgs) {
  const { error } = await supabase
    .from("lists")
    .update({ state: "deleted", updated_at: Date.now() })
    .eq("slug", list);

  if (error) {
    console.error("Error deleting list:", error);
  }

  return redirectWithSuccess("/", "List " + list + " deleted successfully");
}
