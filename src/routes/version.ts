import { createFileRoute } from "@tanstack/solid-router";

// The deployed build's git details: CI polls it after a deploy, and
// version-guard.browser.ts compares its hash with the bundle's own. A
// server route (no page), like auth/confirm.ts.
export const Route = createFileRoute("/version")({
  server: {
    handlers: {
      GET: () => {
        const hash = import.meta.env.VITE_GIT_HASH ?? "unknown";
        const pr = import.meta.env.VITE_PR_NUMBER || null;
        const branch = import.meta.env.VITE_BRANCH || null;

        return Response.json({
          hash,
          shortHash: hash.slice(0, 7),
          date: import.meta.env.VITE_GIT_DATE ?? "unknown",
          pr: pr ? `https://github.com/MattyBalaam/shorpin/pull/${pr}` : null,
          branch,
          commits: `https://github.com/MattyBalaam/shorpin/commits/${branch ?? hash}`,
        });
      },
    },
  },
});
