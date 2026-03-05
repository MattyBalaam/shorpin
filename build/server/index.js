(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		e.SENTRY_RELEASE = { id: "b84e38fdf015bb09d1a3ae613e2a6737c0b46eb0" };
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "4d961f81-21d4-4663-baf2-f291df0bd949", e._sentryDebugIdIdentifier = "sentry-dbid-4d961f81-21d4-4663-baf2-f291df0bd949");
	} catch (e) {}
})();
import "isbot";
import "react-dom/server";
import "react-router";
import * as Sentry from "@sentry/react-router";
import "react/jsx-runtime";
import "react";
import "remix-toast/middleware";
import "@supabase/ssr";
import "sonner";
import "@conform-to/react/future";
import "valibot";
import "remix-toast";
import "motion/react";
Object.defineProperty;
Sentry.init({
	dsn: void 0,
	tracesSampleRate: .1
});
throw new Error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY environment variables");
export { allowedActionOrigins, server_manifest_default as assets, assetsBuildDirectory, basename, entry, future, isSpaMode, prerender, publicPath, routeDiscovery, routes, ssr };
var server_manifest_default;
