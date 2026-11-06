import { redirect } from "@tanstack/solid-router";
import { createServerFn } from "@tanstack/solid-start";
import { setCookie } from "@tanstack/solid-start/server";
import { APP_STYLE_COOKIE } from "~/lib/app-style";
import { createSupabaseClient } from "~/lib/supabase.server";

export const signOut = createServerFn({ method: "POST" }).handler(async () => {
  const supabase = createSupabaseClient();
  await supabase.auth.signOut();
  // The style cookie caches this account's choice (see src/lib/app-style.ts);
  // expire it so signed-out pages, and whoever signs in next, get the default.
  setCookie(APP_STYLE_COOKIE, "", { path: "/", maxAge: 0 });
  throw redirect({ to: "/login" });
});
