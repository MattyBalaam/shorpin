import { createFileRoute } from "@tanstack/solid-router";

// `/` itself: home (the layout) with no dialog open. See routes.ts.
export const Route = createFileRoute("/_app/_home/")({});
