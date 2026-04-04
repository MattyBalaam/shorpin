import { createSupabaseClient } from "~/lib/supabase.server";
import type { Route } from "./+types/health";

export async function loader({ request }: Route.LoaderArgs) {
  const start = performance.now();

  const { supabase } = createSupabaseClient(request);

  supabase
    .from("lists")
    .select("id", { head: true })
    .limit(1)
    .then(({ error }) => {
      if (error) {
        console.warn("[Health] Supabase check failed:", error.message);
      }
    });

  const duration = performance.now() - start;

  return new Response("ok", {
    status: 200,
    headers: { "X-Health-Duration": `${Math.round(duration)}ms` },
  });
}
