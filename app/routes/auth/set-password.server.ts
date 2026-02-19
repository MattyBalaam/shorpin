import type { Route } from "./+types/set-password";
import { redirectWithSuccess } from "remix-toast";
import { href } from "react-router";
import { supabaseContext } from "~/lib/supabase.middleware";

export async function loader({ context }: Route.LoaderArgs) {
  const supabase = context.get(supabaseContext);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { email: user?.email ?? "" };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const password = formData.get("password") as string;
  const confirm = formData.get("confirm-password") as string;

  if (password !== confirm) {
    return { error: "Passwords do not match" };
  }

  const supabase = context.get(supabaseContext);
  const { error } = await supabase.auth.updateUser({ password });

  if (error) {
    return { error: error.message };
  }

  throw await redirectWithSuccess(href("/"), "Password updated successfully");
}
