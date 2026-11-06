// Browser-only (`*.browser.ts`): each export is wrapped in createClientOnlyFn,
// so the server build stubs it and drops this module's browser code. Keep the
// top level free of browser APIs (see "Client-only modules" in README.md).
import { createClientOnlyFn } from "@tanstack/solid-start";

// Sentry is ~95 KB gzipped, so it's kept off the critical path: nothing
// imports `@sentry/browser` statically. It's loaded once the browser is idle
// after hydration, and any errors raised before then are queued and flushed
// into it once it's ready.

type SentryModule = typeof import("./sentry.client");

let sentry: SentryModule | undefined;
let loading: Promise<void> | undefined;
const pending: unknown[] = [];

function onEarlyError(event: ErrorEvent) {
  pending.push(event.error ?? event.message);
}

function onEarlyRejection(event: PromiseRejectionEvent) {
  pending.push(event.reason);
}

export const reportError = createClientOnlyFn(function reportError(error: unknown) {
  if (sentry) {
    sentry.captureException(error);
  } else {
    pending.push(error);
  }
});

async function loadSentry() {
  const Sentry = await import("./sentry.client");
  Sentry.initSentry();

  // Sentry's own global handlers have taken over.
  window.removeEventListener("error", onEarlyError);
  window.removeEventListener("unhandledrejection", onEarlyRejection);

  sentry = Sentry;
  for (const error of pending.splice(0)) {
    Sentry.captureException(error);
  }
}

/**
 * Called from root.tsx's module body, before hydration, so errors thrown
 * while hydrating are queued rather than lost.
 */
export const initMonitoring = createClientOnlyFn(function initMonitoring() {
  if (!loading) {
    window.addEventListener("error", onEarlyError);
    window.addEventListener("unhandledrejection", onEarlyRejection);
  }
  loading ??= new Promise<void>((resolve) => {
    // Fall back to a short timeout where requestIdleCallback isn't available.
    if ("requestIdleCallback" in window) requestIdleCallback(() => resolve(), { timeout: 3000 });
    else setTimeout(resolve, 1000);
  }).then(loadSentry);
  return loading;
});
