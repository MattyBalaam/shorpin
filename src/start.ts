import { captureException } from "@sentry/node";
import { isNotFound, isRedirect } from "@tanstack/solid-router";
import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/solid-start";

// Rejects cross-site mutations (server function POSTs, /perf) with a 403.
// Replaces React Router's origin check. Browsers are judged by
// Sec-Fetch-Site, which must be same-origin. Clients without it fall back to
// Origin (or Referer), compared with request.url's origin. Behind Coolify's
// proxy that's the container's plain-HTTP address (srvx doesn't trust
// X-Forwarded-* unless told to), so the public and staging origins are
// allowed by name, as `allowedActionOrigins` did. A request with none of the three headers isn't
// from a browser (every one we target sends Sec-Fetch-Site), so it can't be
// a forged one: scripts and health checks pass.
const publicOrigins = new Set([
  "https://shorpin.matthewbalaam.co.uk",
  "https://staging.shorpin.matthewbalaam.co.uk",
]);
// Coolify PR previews serve at `<pr>.shorpin.matthewbalaam.co.uk` (README
// "PR preview deployments"). Only preview builds allow them, and only one
// label deep.
const previewOrigin = /^https:\/\/[a-z0-9-]+\.shorpin\.matthewbalaam\.co\.uk$/;
const isPreviewOrigin = (origin: string) =>
  import.meta.env.MODE === "preview" && previewOrigin.test(origin);
const safeMethods = new Set(["GET", "HEAD", "OPTIONS"]);

const rejectCrossSiteMutations = createCsrfMiddleware({
  filter: ({ request }) => !safeMethods.has(request.method),
  allowRequestsWithoutOriginCheck: true,
  origin: (origin, { request }) =>
    publicOrigins.has(origin) || isPreviewOrigin(origin) || origin === new URL(request.url).origin,
});

// Server errors to Sentry, which instrument.server.mjs set up before the
// server started. Start turns a thrown error into a response (a page's
// error state, or a server function's serialized error), so nothing would
// reach Sentry's uncaught-error handlers. Replaces React Router's
// `handleError` (entry.server.tsx). The client reports its own
// (src/lib/monitoring.browser.ts).

function report(error: unknown, mechanism: string) {
  // Control flow, not failures: authMiddleware's redirect to /login, and
  // loaders' notFound().
  if (isRedirect(error) || isNotFound(error)) return;
  captureException(error, { mechanism: { type: mechanism, handled: false } });
}

const reportRequestErrors = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    report(error, "shorpin.request");
    throw error;
  }
});

const reportServerFunctionErrors = createMiddleware({ type: "function" }).server(
  async ({ next }) => {
    try {
      return await next();
    } catch (error) {
      report(error, "shorpin.server_function");
      throw error;
    }
  },
);

// Preview builds mock Supabase in-process (see preview-mocks.server.ts),
// started by the first request. Other builds drop this branch.
let previewMocks: Promise<void> | undefined;

const requestMiddleware =
  import.meta.env.MODE === "preview"
    ? [
        rejectCrossSiteMutations,
        createMiddleware().server(async ({ next }) => {
          previewMocks ??= import("~/lib/preview-mocks.server").then((mocks) =>
            mocks.startPreviewMocks(),
          );
          await previewMocks;
          return next();
        }),
        reportRequestErrors,
      ]
    : [rejectCrossSiteMutations, reportRequestErrors];

export const startInstance = createStart(() => ({
  requestMiddleware,
  functionMiddleware: [reportServerFunctionErrors],
}));
