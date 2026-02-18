import { href } from "react-router";
import type { Route } from "./+types/delete";
import { redirectWithSuccess } from "remix-toast";
import { supabaseContext } from "~/lib/supabase.middleware";

export async function loader({ params: { list }, request, context }: Route.LoaderArgs) {
  const supabase = context.get(supabaseContext);

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

export async function action({ params: { list }, context }: Route.ActionArgs) {
  const supabase = context.get(supabaseContext);

  const { error } = await supabase
    .from("lists")
    .update({ state: "deleted", updated_at: Date.now() })
    .eq("slug", list);

  if (error) {
    console.error("Error deleting list:", error);
  }

  return redirectWithSuccess(href("/"), "List " + list + " deleted successfully");
}
