import { createServerFn } from "@tanstack/solid-start";
import { createSupabaseClient } from "~/lib/supabase.server";
import { zForgotPassword } from "./schemas";

/** Sends a reset link. No auth: the user is signed out by definition. */
export const sendResetLink = createServerFn({ method: "POST" })
  .validator(zForgotPassword)
  .handler(async ({ data: { email } }) => {
    const supabase = createSupabaseClient();
    // The result is ignored: the page always says the same thing, so it
    // can't be used to find out whether an address has an account.
    await supabase.auth.resetPasswordForEmail(email);
  });
