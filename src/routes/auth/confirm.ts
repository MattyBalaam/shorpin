import type { EmailOtpType } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/solid-router";
import { createSupabaseClient } from "~/lib/supabase.server";

const PASSWORD_SETUP_TYPES: EmailOtpType[] = ["recovery", "invite"];

// Where the links in Supabase's emails land: a server route (no page), like
// React Router's resource route. It verifies the link's token, which signs
// the user in (the session cookies ride on the redirect), then sends them
// on: to set a password for a recovery or invite link, else home.
export const Route = createFileRoute("/_auth/auth/confirm")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token_hash = url.searchParams.get("token_hash");
        const type = url.searchParams.get("type") as EmailOtpType | null;

        if (!token_hash || !type) return new Response("Missing token", { status: 400 });

        const supabase = createSupabaseClient();
        const { error } = await supabase.auth.verifyOtp({ token_hash, type });

        if (error) {
          console.error("Error verifying OTP:", error);
          return new Response("Invalid or expired link", { status: 400 });
        }

        const destination = PASSWORD_SETUP_TYPES.includes(type) ? "/set-password" : "/";
        // Not Response.redirect(): its headers are immutable, and Start
        // appends the session's Set-Cookie headers to the returned response.
        return new Response(null, { status: 302, headers: { Location: destination } });
      },
    },
  },
});
