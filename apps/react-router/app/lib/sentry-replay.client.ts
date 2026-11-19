// Session replay is ~45% of Sentry's code, so it's its own chunk: only
// imported dynamically by sentry.client.ts, once a session needs it.
export { replayIntegration } from "@sentry/react-router";
