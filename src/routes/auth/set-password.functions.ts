import { createServerFn } from "@tanstack/solid-start";
import { createSupabaseClient } from "~/lib/supabase.server";
import { zSetPassword } from "./schemas";

// No authMiddleware: the page is reached from an emailed link (see
// confirm.functions.ts), and without a session updateUser fails with a
// message the form shows, rather than bouncing to sign-in.

/** The signed-in email, for password managers to save the new password against. */
export const getSetPasswordEmail = createServerFn({ method: "GET" }).handler(async () => {
  const supabase = createSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return { email: user?.email ?? "" };
});

/** Sets the password. The page goes home and says so itself. */
export const setPassword = createServerFn({ method: "POST" })
  .validator(zSetPassword)
  .handler(async ({ data: { password } }) => {
    const supabase = createSupabaseClient();
    const { error } = await supabase.auth.updateUser({ password });
    return { formError: error?.message ?? null };
  });
