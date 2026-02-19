import type { Route } from "./+types/sign-ups";
import { supabaseContext } from "~/lib/supabase.middleware";

export async function loader({ context }: Route.LoaderArgs) {
  const supabase = context.get(supabaseContext);

  const { data, error } = await supabase
    .from("waitlist")
    .select("id, email, first_name, last_name, created_at")
    .order("created_at", { ascending: true });

  if (error) throw error;

  return { signUps: data ?? [] };
}

export async function action({ request, context }: Route.ActionArgs) {
  const formData = await request.formData();
  const ids = formData.getAll("ids") as string[];

  if (ids.length === 0) return null;

  const supabase = context.get(supabaseContext);

  const { error } = await supabase
    .from("waitlist")
    .delete()
    .in("id", ids);

  if (error) throw error;

  return null;
}
