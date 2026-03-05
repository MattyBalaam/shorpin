(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		e.SENTRY_RELEASE = { id: "b84e38fdf015bb09d1a3ae613e2a6737c0b46eb0" };
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "dd80975d-2011-4405-a0f6-9da218003db3", e._sentryDebugIdIdentifier = "sentry-dbid-dd80975d-2011-4405-a0f6-9da218003db3");
	} catch (e) {}
})();
import { domMax } from "motion/react";
var motion_features_default = domMax;
export { motion_features_default as default };
