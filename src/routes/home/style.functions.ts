import { createServerFn } from "@tanstack/solid-start";
import * as v from "valibot";
import { type AppStyle, appStyles, DEFAULT_APP_STYLE } from "~/lib/app-style";
import { setAppStyleCookie } from "~/lib/app-style.server";
import { authMiddleware } from "~/lib/supabase.middleware";

const zSetAppStyle = v.object({
  style: v.picklist(Object.keys(appStyles) as AppStyle[]),
});

/**
 * Saves the account's style to its profile, and caches it in the cookie
 * the server renders <html> from. Returns an error message on failure; the
 * dialog goes back to home itself (React Router's action redirected).
 */
export const saveAccountStyle = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zSetAppStyle)
  .handler(async ({ data: { style }, context: { supabase, user } }) => {
    const { error } = await supabase
      .from("profiles")
      .update({ app_style: style === DEFAULT_APP_STYLE ? null : style })
      .eq("id", user.id);
    if (error) {
      console.error("Error saving app style:", error);
      return { error: "Couldn't save your style. Please try again." };
    }

    setAppStyleCookie(style);
    return { error: null };
  });
