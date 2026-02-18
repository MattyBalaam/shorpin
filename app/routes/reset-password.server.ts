import { redirect } from "react-router";
import type { Route } from "./+types/reset-password";
import { createSupabaseClient } from "~/lib/supabase.server";
import { redirectWithSuccess } from "remix-toast";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");

  if (!code) {
    throw new Response("Missing reset code", { status: 400 });
  }

  const headers = new Headers();
  const supabase = createSupabaseClient(request, headers);

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    throw new Response("Invalid or expired reset link", { status: 400 });
  }

  return new Response(null, { headers });
}

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
