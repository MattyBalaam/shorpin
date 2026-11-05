import { createServerFn } from "@tanstack/solid-start";
import { createSupabaseClient } from "~/lib/supabase.server";
import { zRequestAccess } from "./schemas";

/**
 * Adds the visitor to the waitlist. Returns a form error rather than
 * throwing; on success the page goes to sign-in and says so (React Router's
 * action flashed the message through a cookie with its redirect).
 */
export const requestAccess = createServerFn({ method: "POST" })
  .validator(zRequestAccess)
  .handler(async ({ data: { email, first_name, last_name } }) => {
    const supabase = createSupabaseClient();
    const { error } = await supabase.from("waitlist").insert({ email, first_name, last_name });

    if (error) {
      console.error("Error adding to waitlist:", error);
      return { formError: "Something went wrong. Please try again." };
    }
    return { formError: null };
  });
