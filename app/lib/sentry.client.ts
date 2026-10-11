// Only ever loaded via dynamic import from monitoring.client.ts. Named imports
// (rather than `await import("@sentry/react-router")`) keep tree-shaking
// working, so unused integrations like feedback stay out of the chunk.
import {
  captureException,
  init,
  reactRouterTracingIntegration,
  replayIntegration,
} from "@sentry/react-router";

export { captureException };

export function initSentry() {
  init({
    dsn: import.meta.env.VITE_SENTRY_DSN,

    integrations: [
      reactRouterTracingIntegration(),
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
