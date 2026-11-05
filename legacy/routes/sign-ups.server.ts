import { href } from "react-router";
import type { Route } from "./+types/sign-ups";
import { supabaseContext } from "~/lib/supabase.middleware";
import { redirectWithSuccess } from "remix-toast";

export async function loader({ context }: Route.LoaderArgs) {
  const supabase = context.get(supabaseContext);

  // Streamed rather than awaited, so the modal opens straight away and the
  // list fills in when the query resolves (see SignUpsList).
  const signUps = (async () => {
    const { data, error } = await supabase
      .from("waitlist")
      .select("id, email, first_name, last_name, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading sign-ups:", error);
      throw error;
    }
    return data ?? [];
  })();

  return { signUps };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const ids = formData.getAll("ids") as string[];

  if (ids.length === 0) return null;

  const supabase = context.get(supabaseContext);

  const { error } = await supabase.from("waitlist").delete().in("id", ids);

  if (error) {
    console.error("Error deleting sign-ups:", error);
    throw error;
  }

  return redirectWithSuccess(href("/"), "Sign-ups handled.");
}
