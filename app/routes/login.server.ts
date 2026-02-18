import { redirect, href } from "react-router";
import type { Route } from "./+types/login";
import { supabaseContext } from "~/lib/supabase.middleware";

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const supabase = context.get(supabaseContext);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  throw redirect(href("/"));
}
