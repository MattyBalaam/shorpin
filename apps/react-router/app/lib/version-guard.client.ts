// Detects a client bundle that predates a server-side fix (e.g. a proxy/
// action-origin misconfig, like PR #94) so mutations from an already-open
// tab fail against the redeployed server. Compares the hash baked into this
// bundle at build time (see Dockerfile's VITE_GIT_HASH build arg, surfaced
// server-side by app/routes/version.ts) against a live /version check, and
// if they differ, forces the service worker to take over the new build
// before a single silent retry of the failed action.

import { applyUpdateNow } from "./service-worker.client";

const BUILD_HASH = import.meta.env.VITE_GIT_HASH ?? "unknown";

async function isAppStale(): Promise<boolean> {
  try {
    const response = await fetch("/version", { cache: "no-store" });
    if (!response.ok) return false;
    const { hash } = (await response.json()) as { hash: string };
    return hash !== "unknown" && hash !== BUILD_HASH;
  } catch {
    return false;
  }
}

async function refreshServiceWorker(): Promise<void> {
  if (!("serviceWorker" in navigator)) return;

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return;

  // Skips the reload prompt: the retry below needs the new build now.
  await applyUpdateNow(registration);
}

/**
 * Wraps a route's serverAction() call: if it fails and /version reports a
 * newer build than the one running, updates the service worker and retries
 * once, transparently. Any other failure (including a retry that still
 * fails) is rethrown for the route's ErrorBoundary to handle.
 */
export async function withStaleVersionRetry<T>(attempt: () => Promise<T>): Promise<T> {
  try {
    return await attempt();
  } catch (error) {
    if (!(await isAppStale())) throw error;

    await refreshServiceWorker();

    return attempt();
  }
}
