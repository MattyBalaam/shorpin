import { createServerFn } from "@tanstack/solid-start";
import * as v from "valibot";
import { type AppStyle, appStyles, INHERIT_APP_STYLE } from "~/lib/app-style";
import { authMiddleware } from "~/lib/supabase.middleware";

// Saved on its own, never with the list's items, so a stale tab adding an
// item can't reset it. INHERIT_APP_STYLE clears the override.
const zSetListStyle = v.object({
  slug: v.string(),
  style: v.picklist([...(Object.keys(appStyles) as AppStyle[]), INHERIT_APP_STYLE]),
});

/** Saves a list's style override. Returns an error message on failure. */
export const saveListStyle = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(zSetListStyle)
  .handler(async ({ data: { slug, style }, context: { supabase } }) => {
    // Any member may: see the "members can update accessible lists" policy.
    const { error } = await supabase
      .from("lists")
      .update({ theme_style: style === INHERIT_APP_STYLE ? null : style })
      .eq("slug", slug);
    if (error) {
      console.error("Error saving list style:", error);
      return { error: "Couldn't save the list style. Please try again." };
    }
    return { error: null };
  });
