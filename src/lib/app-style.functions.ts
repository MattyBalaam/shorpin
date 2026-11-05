import { createServerFn } from "@tanstack/solid-start";
import { readAccountAppStyle, setAppStyleCookie } from "./app-style.server";
import { createSupabaseClient } from "./supabase.server";

/**
 * The signed-in account's style from its profile, cached in the style
 * cookie; null when signed out. For the root loader's server render when
 * there's no cookie yet. No auth middleware: signed-out pages ask too, and
 * just get the default.
 */
export const getAccountAppStyle = createServerFn({ method: "GET" }).handler(async () => {
  const style = await readAccountAppStyle(createSupabaseClient());
  if (style) setAppStyleCookie(style);
  return style;
});
