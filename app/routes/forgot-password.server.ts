import type { Route } from "./+types/forgot-password";
import { supabaseContext } from "~/lib/supabase.middleware";

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const email = formData.get("email") as string;

  const supabase = context.get(supabaseContext);
  await supabase.auth.resetPasswordForEmail(email);

  // Always return success to avoid leaking whether an email exists
  return { success: true };
}
