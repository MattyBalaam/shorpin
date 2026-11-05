/// <reference lib="webworker" />

// Precache/shell-boot service worker — deliberately narrow scope. It never
// intercepts or fabricates server function calls (`/_serverFn/…`, Start's
// own wire protocol) or any other non-navigation request; offline
// reads/writes are handled one layer up by each route's loader and
// handlers, backed by IndexedDB (see src/lib/offline-store.browser.ts). This
// SW only precaches hashed static assets, runtime-caches home/list's
// rendered HTML (network-first, so a hard reload/cold-open while offline
// shows the user's own last-seen page instead of a generic message), and
// provides a fallback shell for navigations made with no network at all and
// no runtime-cached copy. See README.md's "Offline / Local-first" section.

import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { matchPrecache, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { LAUNCH_PARAM } from "~/lib/default-list";
import { isCacheablePageUrl, PAGE_CACHE_NAME } from "~/lib/page-cache";
import { SKIP_WAITING } from "~/lib/service-worker-messages";

declare const self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// Only ever populated with home ("/") and list ("/lists/:list") responses —
// see isCacheablePageUrl. Cleared on sign-out (src/routes/home/home.tsx)
// alongside clearAllOfflineData(), since this is per-user SSR HTML.
const pageCache = new NetworkFirst({
  cacheName: PAGE_CACHE_NAME,
  plugins: [
    new CacheableResponsePlugin({ statuses: [200] }),
    new ExpirationPlugin({ maxEntries: 50, purgeOnQuotaError: true }),
    {
      // The manifest's start_url is `/?launch`, which online always
      // redirects (never cached). Offline, look it up as plain `/` so the
      // home loader can hydrate and do the launch redirect itself.
      cacheKeyWillBeUsed: async ({ request }) => {
        const url = new URL(request.url);
        url.searchParams.delete(LAUNCH_PARAM);
        return url.href;
      },
    },
  ],
});

registerRoute(
  ({ request }) => request.mode === "navigate",
  async (args) => {
    const { request, url } = args;
    try {
      return isCacheablePageUrl(url.pathname) ? await pageCache.handle(args) : await fetch(request);
    } catch {
      // Either a plain network failure on a non-cacheable route, or
      // NetworkFirst exhausted both network and cache (a cacheable route
      // never visited while online) — same fallback either way.
      //
      // Not a plain caches.match("/offline.html") — workbox's precache
      // stores non-hashed entries under a cache key with a
      // ?__WB_REVISION__=... query param appended for cache-busting, so a
      // literal-URL lookup misses; matchPrecache resolves that correctly.
      const offlineShell = await matchPrecache("offline.html");
      return offlineShell ?? Response.error();
    }
  },
);

// Every server function call (and every other non-navigation request that
// isn't precached) falls through untouched, with no registerRoute match:
// this SW never participates in Start's wire protocol.
//
// There's no Background Sync backstop any more. React Router's queued
// entries were plain form posts to `/`, which this worker could replay with
// fetch(); Start's server functions have their own serialized payload, and
// rebuilding it here would couple the worker to that format. Home and list
// replay their queues on the `online` event and on mount instead.

// No skipWaiting on install: a redeployed worker waits behind the current
// one rather than taking over pages still running the previous build's JS.
// The page posts SKIP_WAITING once the user accepts its reload prompt, or
// when version-guard.browser.ts needs the new build to retry a failed
// mutation (see src/lib/service-worker.client.ts). A first-ever install has
// nothing to wait behind, so it activates immediately.
self.addEventListener("message", (event) => {
  if (event.data?.type === SKIP_WAITING) void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
