// Only ever loaded via dynamic import from monitoring.browser.ts. Named
// imports (rather than `await import("@sentry/browser")`) keep tree-shaking
// working, so unused integrations like feedback stay out of the chunk.
import {
  browserTracingIntegration,
  captureException,
  init,
  replayIntegration,
} from "@sentry/browser";

export { captureException };

export function initSentry() {
  init({
    dsn: import.meta.env.VITE_SENTRY_DSN,

    integrations: [
      // Spans are named by URL (/lists/milk), not by route: Sentry's
      // TanStack Router integration (@sentry/solid) targets Solid 1 and
      // router 1. Fine at this traffic; parametrise in beforeStartSpan if
      // the transaction list gets noisy.
      browserTracingIntegration(),
      replayIntegration({
        maskAllText: false,
        blockAllMedia: false,
      }),
    ],

    tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,

    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
  });
}
