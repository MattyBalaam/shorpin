(function() {
	try {
		var e = "undefined" != typeof window ? window : "undefined" != typeof global ? global : "undefined" != typeof globalThis ? globalThis : "undefined" != typeof self ? self : {};
		e.SENTRY_RELEASE = { id: "b84e38fdf015bb09d1a3ae613e2a6737c0b46eb0" };
		var n = new e.Error().stack;
		n && (e._sentryDebugIds = e._sentryDebugIds || {}, e._sentryDebugIds[n] = "5cea54a1-a5ea-48e5-9171-9dfa7ca8393e", e._sentryDebugIdIdentifier = "sentry-dbid-5cea54a1-a5ea-48e5-9171-9dfa7ca8393e");
	} catch (e) {}
})();
const realtimeClient = void 0;
export { realtimeClient };
