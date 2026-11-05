import { createFileRoute } from "@tanstack/solid-router";
import { createSupabaseClient } from "~/lib/supabase.server";

// The Dockerfile's health check. A server route (no page), like
// auth/confirm.ts. It answers straight away: the Supabase check runs in
// the background and only logs, so a slow database can't fail the
// container's health check.
export const Route = createFileRoute("/health")({
  server: {
    handlers: {
      GET: () => {
        const start = performance.now();

        const supabase = createSupabaseClient();

        void supabase
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
      },
    },
  },
});
