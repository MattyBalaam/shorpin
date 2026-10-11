// Sentry is ~95 KB gzipped — bigger than react-dom — so it's kept off the
// critical path: nothing imports `@sentry/react-router` statically on the
// client. It's loaded once the browser is idle after hydration, and any errors
// raised before then are queued and flushed into it once it's ready.

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

// Sentry's own global handlers take over once it's initialised; until then,
// capture uncaught errors ourselves so hydration-time crashes aren't lost.
window.addEventListener("error", onEarlyError);
window.addEventListener("unhandledrejection", onEarlyRejection);

export function reportError(error: unknown) {
  if (sentry) {
    sentry.captureException(error);
  } else {
    pending.push(error);
  }
}

async function loadSentry() {
  const Sentry = await import("./sentry.client");
  Sentry.initSentry();

  window.removeEventListener("error", onEarlyError);
  window.removeEventListener("unhandledrejection", onEarlyRejection);

  sentry = Sentry;
  for (const error of pending.splice(0)) {
    Sentry.captureException(error);
  }
}

export function initMonitoring() {
  loading ??= new Promise<void>((resolve) => {
    // Fall back to a short timeout where requestIdleCallback isn't available.
    const schedule =
      "requestIdleCallback" in window
        ? (cb: () => void) => requestIdleCallback(cb, { timeout: 3000 })
        : (cb: () => void) => setTimeout(cb, 1000);
    schedule(resolve);
  }).then(loadSentry);
  return loading;
}
