import { href } from "react-router";
import type { Route } from "./+types/delete";
import { redirectWithError, redirectWithSuccess } from "remix-toast";
import { supabaseContext } from "~/lib/supabase.middleware";

export async function loader({ params: { list }, request, context }: Route.LoaderArgs) {
  const supabase = context.get(supabaseContext);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("lists")
    .select("name, user_id")
    .eq("slug", list)
    .eq("state", "active")
    .single();

  if (!data) {
    throw new Response("List not found", { status: 404 });
  }

  if (data.user_id !== user?.id) {
    throw redirectWithError(href("/"), "Only the list owner can delete this list.");
  }

  return {
    listName: data.name,
    returnTo: request.headers.get("referer") || href("/"),
  };
}

export async function action({ params: { list }, context }: Route.ActionArgs) {
  const supabase = context.get(supabaseContext);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data } = await supabase
    .from("lists")
    .select("user_id")
    .eq("slug", list)
    .eq("state", "active")
    .single();

  if (!data || data.user_id !== user?.id) {
    throw redirectWithError(href("/"), "Only the list owner can delete this list.");
  }

  const { error } = await supabase
    .from("lists")
    .update({ state: "deleted", updated_at: Date.now() })
    .eq("slug", list);

  if (error) {
    console.error("Error deleting list:", error);
  }

  return redirectWithSuccess(href("/"), "List " + list + " deleted successfully");
}
