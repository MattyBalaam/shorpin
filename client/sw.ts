/// <reference lib="webworker" />
// The service worker: offline pages and offline changes, with no framework
// protocol to imitate. Pages are plain HTML and changes are plain form
// posts, so offline support is "keep the last copy of each page" and "keep
// the posts that couldn't be sent, and send them later".
import { isCacheablePageUrl, PAGE_CACHE_NAME } from "../lib/page-cache.ts";
import { enqueue, isQueueable, replayQueue } from "./lib/queue.ts";

// Background Sync isn't in TypeScript's libs yet (and isn't in Safari or
// Firefox at all, hence the optional chaining where it's used).
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}
declare global {
  interface ServiceWorkerRegistration {
    readonly sync?: { register(tag: string): Promise<void> };
  }
  interface ServiceWorkerGlobalScopeEventMap {
    sync: SyncEvent;
  }
}

declare const self: ServiceWorkerGlobalScope;

// Replaced at build time with this build's hashed assets (vite.config.ts).
const PRECACHE: string[] = JSON.parse('"__PRECACHE_MANIFEST__"') as unknown as string[];
const ASSET_CACHE = `shorpin-assets-${hash(PRECACHE.join())}`;

function hash(text: string) {
  let value = 0;
  for (const char of text) value = (Math.imul(31, value) + char.charCodeAt(0)) | 0;
  return (value >>> 0).toString(36);
}

self.addEventListener("install", (event) => {
  // No skipWaiting: an update waits until the page offers a reload.
  event.waitUntil(caches.open(ASSET_CACHE).then((cache) => cache.addAll(PRECACHE)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      for (const name of await caches.keys()) {
        if (name.startsWith("shorpin-assets-") && name !== ASSET_CACHE) await caches.delete(name);
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  if (request.method === "GET" && url.pathname.startsWith("/assets/")) {
    event.respondWith(caches.match(request).then((cached) => cached ?? fetch(request)));
    return;
  }

  // Home and list pages: network first, the last good copy when offline.
  if (request.mode === "navigate" && request.method === "GET") {
    event.respondWith(navigate(request, url));
    return;
  }

  if (request.method === "POST" && isQueueable(url.pathname) && !request.headers.has("X-Replay")) {
    event.respondWith(postOrQueue(request, url));
  }
});

async function navigate(request: Request, url: URL) {
  try {
    const response = await fetch(request);
    if (response.ok && isCacheablePageUrl(url.pathname) && !response.redirected) {
      const cache = await caches.open(PAGE_CACHE_NAME);
      await cache.put(url.pathname, response.clone());
    }
    return response;
  } catch {
    const cached = isCacheablePageUrl(url.pathname)
      ? await caches.match(url.pathname, { cacheName: PAGE_CACHE_NAME })
      : undefined;
    return cached ?? (await caches.match("/offline.html")) ?? Response.error();
  }
}

async function postOrQueue(request: Request, url: URL) {
  const body = await request.clone().text();
  try {
    return await fetch(request);
  } catch {
    await enqueue({ url: url.pathname, body, queuedAt: Date.now() });
    await self.registration.sync?.register("replay").catch(() => {});
    if (request.headers.has("X-Enhance")) {
      return new Response(null, { status: 202, headers: { "X-Queued": "1" } });
    }
    // A post without a script: say what happened, and offer the way back.
    const back = url.pathname.replace(/\/items$/, "");
    return new Response(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Saved offline | Shorpin</title><main style="font-family: system-ui; padding: 1rem"><h1>You're offline</h1><p>Your change is saved on this device and will be sent when you're back online.</p><p><a href="${back}">Back</a></p></main>`,
      { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
    );
  }
}

// --- Replaying the queue ---

// Only for when no page is open: an open page replays the queue itself.
async function replayAndTell() {
  await replayQueue();
}

self.addEventListener("sync", (event) => {
  if (event.tag === "replay") event.waitUntil(replayAndTell());
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") void self.skipWaiting();
});
