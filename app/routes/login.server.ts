import { redirect } from "react-router";
import type { Route } from "./+types/login";
import { createSupabaseClient } from "~/lib/supabase.server";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const headers = new Headers();
  const supabase = createSupabaseClient(request, headers);

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    return { error: error.message };
  }

  throw redirect("/", { headers });
}
