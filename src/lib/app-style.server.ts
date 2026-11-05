import { type AppStyle, DEFAULT_APP_STYLE, isAppStyle } from "./app-style";
import type { SupaBaseContext } from "./supabase.middleware";

/**
 * The signed-in account's style, or null when signed out (or when it can't
 * be read right now — callers fall back to the default rather than failing
 * the page over a cosmetic preference).
 */
export async function readAccountAppStyle(supabase: SupaBaseContext): Promise<AppStyle | null> {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? await readProfileAppStyle(supabase, user.id) : null;
  } catch {
    return null;
  }
}

/** As readAccountAppStyle, for a caller that already has the user. */
export async function readProfileAppStyle(
  supabase: SupaBaseContext,
  userId: string,
): Promise<AppStyle | null> {
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("app_style")
      .eq("id", userId)
      .maybeSingle();
    if (error) return null;
    return isAppStyle(data?.app_style) ? data.app_style : DEFAULT_APP_STYLE;
  } catch {
    return null;
  }
}
