import { captureException } from "@sentry/node";
import { isNotFound, isRedirect } from "@tanstack/solid-router";
import { createMiddleware, createStart } from "@tanstack/solid-start";

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
        createMiddleware().server(async ({ next }) => {
          previewMocks ??= import("~/lib/preview-mocks.server").then((mocks) =>
            mocks.startPreviewMocks(),
          );
          await previewMocks;
          return next();
        }),
        reportRequestErrors,
      ]
    : [reportRequestErrors];

export const startInstance = createStart(() => ({
  requestMiddleware,
  functionMiddleware: [reportServerFunctionErrors],
}));
