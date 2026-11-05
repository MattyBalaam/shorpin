import { createServerFn } from "@tanstack/solid-start";
import * as v from "valibot";
import { authMiddleware } from "~/lib/supabase.middleware";

// Row-level security limits the waitlist to admins: anyone else reads an
// empty list (and home shows no count) and deletes nothing.

export const getSignUps = createServerFn({ method: "GET" })
  .middleware([authMiddleware])
  .handler(async ({ context: { supabase } }) => {
    const { data, error } = await supabase
      .from("waitlist")
      .select("id, email, first_name, last_name, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading sign-ups:", error);
      throw error;
    }
    return data;
  });

/** Removes the handled entries. The page goes home and says so itself. */
export const handleSignUps = createServerFn({ method: "POST" })
  .middleware([authMiddleware])
  .validator(v.object({ ids: v.pipe(v.array(v.string()), v.minLength(1)) }))
  .handler(async ({ data: { ids }, context: { supabase } }) => {
    const { error } = await supabase.from("waitlist").delete().in("id", ids);

    if (error) {
      console.error("Error deleting sign-ups:", error);
      return { ok: false as const, error: "Failed to update sign-ups. Please try again." };
    }
    return { ok: true as const };
  });
