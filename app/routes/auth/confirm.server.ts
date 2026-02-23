import { redirect, href } from "react-router";
import type { Route } from "./+types/confirm";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseContext } from "~/lib/supabase.middleware";

const PASSWORD_SETUP_TYPES: EmailOtpType[] = ["recovery", "invite"];

export async function loader({ request, context }: Route.LoaderArgs) {
  const url = new URL(request.url);
  const token_hash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;

  if (!token_hash || !type) {
    throw new Response("Missing token", { status: 400 });
  }

  const supabase = context.get(supabaseContext);
  const { error } = await supabase.auth.verifyOtp({ token_hash, type });

  if (error) {
    throw new Response("Invalid or expired link", { status: 400 });
  }

  const destination = PASSWORD_SETUP_TYPES.includes(type) ? href("/set-password") : href("/");

  throw redirect(destination);
}
