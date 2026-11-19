import { SKIP_WAITING } from "./service-worker-messages";

// Update flow: a redeployed sw.js installs in the background and then waits
// behind the worker controlling this page (app/sw.ts doesn't skipWaiting on
// install), so pages never run one build's JS under another build's worker.
// The page offers a reload; accepting tells the waiting worker to activate.

const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
// Foregrounding the app re-checks too, but no more often than this — each
// check re-downloads sw.js.
const MIN_RECHECK_MS = 15 * 60 * 1000;
const WORKER_STATE_TIMEOUT_MS = 5000;

function waitForInstalled(worker: ServiceWorker) {
  return new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, WORKER_STATE_TIMEOUT_MS);
    worker.addEventListener("statechange", () => {
      if (worker.state === "installing") return;
      clearTimeout(timeout);
      resolve();
    });
  });
}

/** Activates a waiting worker, resolving once it controls this page. */
export function activateWaitingWorker(registration: ServiceWorkerRegistration) {
  const { waiting } = registration;
  if (!waiting) return Promise.resolve();

  return new Promise<void>((resolve) => {
    const timeout = setTimeout(resolve, WORKER_STATE_TIMEOUT_MS);
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      () => {
        clearTimeout(timeout);
        resolve();
      },
      { once: true },
    );
    waiting.postMessage({ type: SKIP_WAITING });
  });
}

/** Checks for a new build now and, if there is one, activates it at once. */
export async function applyUpdateNow(registration: ServiceWorkerRegistration) {
  await registration.update();
  if (registration.installing) await waitForInstalled(registration.installing);
  await activateWaitingWorker(registration);
}

/**
 * Calls `onUpdateReady` whenever a newer build's worker is waiting behind the
 * one controlling this page, checking for new builds hourly and when the app
 * returns to the foreground.
 */
export function watchForUpdates(
  registration: ServiceWorkerRegistration,
  onUpdateReady: () => void,
  signal: AbortSignal,
) {
  // No controller means this is the first-ever install, which activates
  // straight away — not an update.
  function notifyIfWaiting() {
    if (registration.waiting && navigator.serviceWorker.controller) onUpdateReady();
  }

  notifyIfWaiting();
  registration.addEventListener(
    "updatefound",
    () => {
      const worker = registration.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed") notifyIfWaiting();
      });
    },
    { signal },
  );

  let lastCheck = Date.now();
  function check() {
    lastCheck = Date.now();
    registration.update().catch(() => {
      // Offline or unreachable — the next check will retry.
    });
  }

  const interval = setInterval(check, UPDATE_CHECK_INTERVAL_MS);
  signal.addEventListener("abort", () => clearInterval(interval));
  document.addEventListener(
    "visibilitychange",
    () => {
      if (document.visibilityState === "visible" && Date.now() - lastCheck > MIN_RECHECK_MS) {
        check();
      }
    },
    { signal },
  );
}
