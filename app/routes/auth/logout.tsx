import { redirect, href } from "react-router";
import type { Route } from "./+types/logout";
import { supabaseContext } from "~/lib/supabase.middleware";

export async function action({ context }: Route.ActionArgs) {
  const supabase = context.get(supabaseContext);
  await supabase.auth.signOut();
  throw redirect(href("/login"));
}
