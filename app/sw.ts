/// <reference lib="webworker" />

// Precache/shell-boot service worker — deliberately narrow scope. It never
// intercepts or fabricates POST responses or `.data` GET responses (React
// Router's own wire protocol); offline reads/writes are handled one layer up
// by each route's clientLoader/clientAction, backed by IndexedDB (see
// app/lib/offline-store.client.ts). This SW only precaches hashed static
// assets, runtime-caches home/list's rendered HTML (network-first, so a
// hard reload/cold-open while offline shows the user's own last-seen page
// instead of a generic message), and provides a fallback shell for
// navigations made with no network at all and no runtime-cached copy, plus
// a best-effort Background Sync backstop for draining simple queued
// mutations. See README.md's "Offline / Local-first" section.

import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { matchPrecache, precacheAndRoute } from "workbox-precaching";
import { registerRoute } from "workbox-routing";
import { NetworkFirst } from "workbox-strategies";
import { pairsToFormData } from "~/lib/form-data-codec";
import { isSuccessfulReplay } from "~/lib/mutation-replay";
import { isCacheablePageUrl, PAGE_CACHE_NAME } from "~/lib/page-cache";

declare const self: ServiceWorkerGlobalScope;

// The Background Sync API isn't part of TypeScript's built-in webworker lib.
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
  readonly lastChance: boolean;
}

precacheAndRoute(self.__WB_MANIFEST);

// Only ever populated with home ("/") and list ("/lists/:list") responses —
// see isCacheablePageUrl. Cleared on logout (app/routes/auth/logout.tsx)
// alongside clearAllOfflineData(), since this is per-user SSR HTML.
const pageCache = new NetworkFirst({
  cacheName: PAGE_CACHE_NAME,
  plugins: [
    new CacheableResponsePlugin({ statuses: [200] }),
    new ExpirationPlugin({ maxEntries: 50, purgeOnQuotaError: true }),
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

// Every POST and every `.data` GET request falls through untouched (no
// registerRoute match), passing straight to the network exactly like the
// old (removed) public/sw.js did for POSTs — this SW never participates in
// React Router's wire protocol.

self.addEventListener("install", () => {
  void self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Best-effort backstop for draining simple queued mutations (list creation,
// list reordering — see home/client-action.ts's kinds) if the tab closes
// before the `online` event listener in useIsOnline gets a chance to. Not
// supported on Safari/iOS (no SyncManager there); the `online` event
// listener remains the universal, primary sync trigger everywhere. Does NOT
// handle list-mutate entries — those need the rebase step in list.tsx's
// performRebaseSync, which requires the React Router client runtime and
// isn't available in a service worker.
self.addEventListener("sync", (event) => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag !== "drain-mutation-queue") return;

  syncEvent.waitUntil(drainSimpleMutations());
});

const DB_NAME = "shorpin-offline";
const MUTATION_QUEUE_STORE = "mutation-queue";

interface QueuedMutation {
  seq: number;
  route: string;
  routeKey: string;
  kind: "list-mutate" | "create-list" | "reorder-lists";
  fields: Array<[string, string]>;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getSimpleQueuedMutations(): Promise<QueuedMutation[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MUTATION_QUEUE_STORE, "readonly");
    const request = transaction.objectStore(MUTATION_QUEUE_STORE).getAll();
    request.onsuccess = () => {
      const all = request.result as QueuedMutation[];
      resolve(all.filter((entry) => entry.kind !== "list-mutate"));
    };
    request.onerror = () => reject(request.error);
  });
}

async function dequeueMutation(seq: number): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(MUTATION_QUEUE_STORE, "readwrite");
    transaction.objectStore(MUTATION_QUEUE_STORE).delete(seq);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

async function drainSimpleMutations(): Promise<void> {
  const queued = await getSimpleQueuedMutations();

  for (const entry of queued) {
    try {
      const response = await fetch(entry.route, {
        method: "POST",
        body: pairsToFormData(entry.fields),
      });
      if (!isSuccessfulReplay(response)) return;
      await dequeueMutation(entry.seq);
    } catch {
      // Still offline — stop here, the rest retries on the next sync event
      // or the next foreground reconnect.
      return;
    }
  }
}
