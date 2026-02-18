import { redirect } from "react-router";
import type { Route } from "./+types/confirm";
import { createSupabaseClient } from "~/lib/supabase.server";

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type");

  if (!token_hash || !type) {
    throw new Response("Missing token", { status: 400 });
  }

  const headers = new Headers();
  const supabase = createSupabaseClient(request, headers);

  const { error } = await supabase.auth.verifyOtp({
    token_hash,
    type: type as "recovery",
  });

  if (error) {
    throw new Response("Invalid or expired link", { status: 400 });
  }

  throw redirect("/reset-password", { headers });
}
