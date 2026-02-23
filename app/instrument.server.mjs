import * as Sentry from "@sentry/react-router";

Sentry.init({
	dsn: import.meta.env.VITE_SENTRY_DSN,

	tracesSampleRate: import.meta.env.DEV ? 1.0 : 0.1,
});
