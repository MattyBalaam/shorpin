// Loaded before the server with `node --import` (see `pnpm start`), so
// Sentry's OpenTelemetry hooks are in place before anything imports `http`.
// The build copies it into .output/server (vite.config.ts), beside the
// traced @sentry/* packages it imports.
import { nodeProfilingIntegration } from "@sentry/profiling-node";
import * as Sentry from "@sentry/node";

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
  // Adds request headers and IP for users, for more info visit:
  // https://docs.sentry.io/platforms/javascript/guides/node/configuration/options/#sendDefaultPii
  sendDefaultPii: true,

  // Enable logs to be sent to Sentry
  enableLogs: true,

  integrations: [nodeProfilingIntegration()],
  tracesSampleRate: 1.0,
  // Profile every sampled trace. (Sentry 11 dropped `profilesSampleRate`,
  // which left the profiler off.)
  profileSessionSampleRate: 1.0,
  profileLifecycle: "trace",

  beforeSend(event) {
    if (event.exception) {
      const error = event.exception.values?.[0];
      if (error?.type === "NotFoundException" || error?.value?.includes("404")) {
        return null;
      }
    }
    return event;
  },
});
