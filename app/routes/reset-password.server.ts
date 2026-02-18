import type { Route } from "./+types/reset-password";
import { createSupabaseClient } from "~/lib/supabase.server";
import { redirectWithSuccess } from "remix-toast";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm-password") as string;

  if (password !== confirm) {
    return { error: "Passwords do not match" };
  }

  const headers = new Headers();
  const supabase = createSupabaseClient(request, headers);

  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  throw await redirectWithSuccess("/", "Password updated successfully");
}
