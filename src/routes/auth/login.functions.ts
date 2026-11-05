import { createServerFn } from "@tanstack/solid-start";
import { createSupabaseClient } from "~/lib/supabase.server";
import { zLogin } from "./schemas";

/**
 * Signs in and sets the session cookies on the response. Returns a form
 * error rather than throwing, so the form can show it. The redirect home is
 * the caller's (see login.dev.tsx): with a server function the page decides
 * where to go next, instead of the action answering with a redirect.
 */
export const signIn = createServerFn({ method: "POST" })
  .validator(zLogin)
  .handler(async ({ data: { email, password } }) => {
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? { formError: error.message } : { formError: null };
  });
