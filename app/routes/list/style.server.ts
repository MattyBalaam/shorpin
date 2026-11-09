import { href, redirect } from "react-router";
import { dataWithError } from "remix-toast";
import * as v from "valibot";
import { type AppStyle, appStyles, INHERIT_APP_STYLE } from "~/lib/app-style";
import { supabaseContext } from "~/lib/supabase.middleware";
import { requireUser } from "~/lib/supabase.server";
import type { Route } from "./+types/style";

// Saved on its own, never with the list form, so a stale tab adding an item
// can't reset it. INHERIT_APP_STYLE clears the override.
const zSetListStyle = v.object({
  style: v.picklist([...(Object.keys(appStyles) as AppStyle[]), INHERIT_APP_STYLE]),
});

export async function action({ request, params: { list }, context }: Route.ActionArgs) {
  const result = v.safeParse(zSetListStyle, Object.fromEntries(await request.formData()));
  if (!result.success) return null;

  const supabase = context.get(supabaseContext);
  await requireUser(supabase);
  const { style } = result.output;
  // Any member may: see the "members can update accessible lists" policy.
  const { error } = await supabase
    .from("lists")
    .update({ theme_style: style === INHERIT_APP_STYLE ? null : style })
    .eq("slug", list);
  if (error) {
    console.error("Error saving list style:", error);
    return dataWithError(null, "Couldn't save the list style. Please try again.");
  }

  // Back to the list, whose revalidation returns the new appStyleOverride.
  throw redirect(href("/lists/:list", { list }));
}
