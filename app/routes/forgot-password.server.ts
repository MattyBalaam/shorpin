import type { Route } from "./+types/forgot-password";
import { createSupabaseClient } from "~/lib/supabase.server";

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;

  const headers = new Headers();
  const supabase = createSupabaseClient(request, headers);

  await supabase.auth.resetPasswordForEmail(email);

  // Always return success to avoid leaking whether an email exists
  return { success: true };
}
