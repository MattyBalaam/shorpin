import { href } from "react-router";
import type { Route } from "./+types/delete";

import { redirectWithSuccess } from "remix-toast";
import { createSupabaseClient } from "~/lib/supabase.server";

export async function loader({ params: { list }, request }: Route.LoaderArgs) {
  const headers = new Headers();
  const supabase = createSupabaseClient(request, headers);

  const { data } = await supabase
    .from("lists")
    .select("name")
    .eq("slug", list)
    .eq("state", "active")
    .single();

  if (!data) {
    throw new Response("List not found", { status: 404 });
  }

  return {
    listName: data.name,
    returnTo: request.headers.get("referer") || href("/"),
  };
}

export async function action({ params: { list }, request }: Route.ActionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseClient(request, headers);

  const { error } = await supabase
    .from("lists")
    .update({ state: "deleted", updated_at: Date.now() })
    .eq("slug", list);

  if (error) {
    console.error("Error deleting list:", error);
  }

  return redirectWithSuccess("/", "List " + list + " deleted successfully");
}
