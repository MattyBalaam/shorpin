import { redirect } from "react-router";
import type { Route } from "./+types/logout";
import { createSupabaseClient } from "~/lib/supabase.server";

export async function action({ request }: Route.ActionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseClient(request, headers);

  await supabase.auth.signOut();

  throw redirect("/login", { headers });
}
