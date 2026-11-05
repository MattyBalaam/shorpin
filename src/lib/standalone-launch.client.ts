// Detects an installed-app launch without relying on the manifest's
// start_url (`/?launch`), which iOS home screen apps ignore — they open at
// `/` (or wherever the page was when added). See README.md's "Default list
// on launch".

// Module state lives exactly as long as the document, so "consumed" means
// "already checked for this page load".
let consumed = false;

function isStandalone() {
  return (
    matchMedia("(display-mode: standalone)").matches ||
    // iOS-only, predates display-mode support in home screen apps.
    ("standalone" in navigator && navigator.standalone === true)
  );
}

/**
 * True only for the first home load of a document that an installed app
 * opened fresh at `url`: not a reload (pull-to-refresh), not back/forward,
 * and not a later in-app navigation back to home (those are client-side, so
 * the document's own navigation entry points somewhere else or was already
 * consumed).
 */
export function consumeStandaloneLaunch(url: URL): boolean {
  if (consumed) return false;
  consumed = true;

  if (!isStandalone()) return false;

  const [entry] = performance.getEntriesByType("navigation") as PerformanceNavigationTiming[];
  return entry?.type === "navigate" && new URL(entry.name).pathname === url.pathname;
}
