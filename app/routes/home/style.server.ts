import { href, redirect } from "react-router";
import { dataWithError } from "remix-toast";
import * as v from "valibot";
import {
  type AppStyle,
  appStyles,
  DEFAULT_APP_STYLE,
  serializeAppStyleCookie,
} from "~/lib/app-style";
import { supabaseContext } from "~/lib/supabase.middleware";
import { requireUser } from "~/lib/supabase.server";
import type { Route } from "./+types/style";

const zSetAppStyle = v.object({
  style: v.picklist(Object.keys(appStyles) as AppStyle[]),
});

export async function action({ request, context }: Route.ActionArgs) {
  const result = v.safeParse(zSetAppStyle, Object.fromEntries(await request.formData()));
  if (!result.success) return null;

  const supabase = context.get(supabaseContext);
  const user = await requireUser(supabase);
  const { style } = result.output;
  const { error } = await supabase
    .from("profiles")
    .update({ app_style: style === DEFAULT_APP_STYLE ? null : style })
    .eq("id", user.id);
  if (error) {
    console.error("Error saving app style:", error);
    return dataWithError(null, "Couldn't save your style. Please try again.");
  }

  // Back to home; the root loader's revalidation reads the new cookie.
  throw redirect(href("/"), { headers: { "Set-Cookie": serializeAppStyleCookie(style) } });
}
