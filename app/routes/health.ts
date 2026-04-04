import type { Route } from "./+types/health";

export async function loader({ request }: Route.LoaderArgs) {
  const start = performance.now();

  // Basic health check - could add more checks here (db, etc)
  const ok = true;

  const duration = performance.now() - start;

  if (!ok) {
    return new Response("unhealthy", { status: 503 });
  }

  return new Response("ok", {
    status: 200,
    headers: { "X-Health-Duration": `${Math.round(duration)}ms` },
  });
}
