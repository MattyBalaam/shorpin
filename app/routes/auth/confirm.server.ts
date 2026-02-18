import { redirect } from "react-router";
import type { Route } from "./+types/confirm";
import { createSupabaseClient } from "~/lib/supabase.server";
import type { EmailOtpType } from "@supabase/supabase-js";

const PASSWORD_SETUP_TYPES: EmailOtpType[] = ["recovery", "invite"];

export async function loader({ request }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (!token_hash || !type) {
    throw new Response("Missing token", { status: 400 });
  }

  const headers = new Headers();
  const supabase = createSupabaseClient(request, headers);

  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    throw new Response("Invalid or expired link", { status: 400 });
  }

  const destination = PASSWORD_SETUP_TYPES.includes(type)
    ? "/set-password"
    : "/";

  throw redirect(destination, { headers });
}
