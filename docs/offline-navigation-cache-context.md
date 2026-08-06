# Context: Offline navigation fallback shows generic page instead of cached content

Handoff brief for planning — not an implementation, not yet started.

## Background

PR #65 (branch `feat/local-first-offline`) added local-first offline support to the home (`/`) and list (`/lists/:list`) routes: IndexedDB-backed caching via `clientLoader`/`clientAction` on each route, plus a service worker (`app/sw.ts`, via `vite-plugin-pwa`'s `injectManifest` strategy) that precaches the app shell and falls back to a static `public/offline.html` when a navigation can't reach the network. Full design rationale is in `README.md`'s "Offline / Local-first" section. Check whether that branch has been merged into `main` yet before assuming current `main` state.

## The gap found in manual testing

The IndexedDB-cached lists only render when the React app is already loaded/hydrated in the tab — client-side navigation between routes while offline works fine from that cache. But a _fresh navigation_ (hard reload, cold app open, new tab) while offline is a real browser-level navigation request, which the SW intercepts, fails to fetch, and falls back to the generic static `offline.html` — never showing the user's actual cached lists, even though that data genuinely exists in IndexedDB.

## Why it's built this way

`offline.html` is a plain file in `public/`, copied verbatim at build time — it can't reference the current build's hashed JS/CSS bundle URLs, so there was no way to make it safely boot the real SPA. This was a known, documented tradeoff from the original design (see `app/sw.ts`'s comments and the README section).

## Proposed direction (needs a plan, not yet implemented)

Cache each visited page's actual rendered HTML response as the user navigates (network-first: always fetch fresh while online, only fall back to the cached copy when the network genuinely fails), so a reload/cold-open while offline shows the user's last-seen version of _that specific page_ instead of the generic message. `offline.html` remains the last-resort fallback for pages never visited.

**Key tradeoff to design around:** this is an authenticated SSR app (`ssr: true`, `react-router.config.ts`) — home/list routes render user-specific data server-side, so caching the raw HTML response means caching a specific user's data. On a shared device, if a different user logs in afterward and loses network before their first successful page load, they could briefly see the previous user's stale cached page. Mitigation: clear this new cache on logout, mirroring the existing pattern — `app/routes/auth/logout.tsx`'s `clientAction` already calls `clearAllOfflineData()` (in `app/lib/offline-store.client.ts`) to wipe the three IndexedDB stores on sign-out; this new HTML cache should get the same treatment (likely via Cache API, `caches.delete()` or similar, not IndexedDB).

## Relevant files

- `app/sw.ts` — the SW itself. Current navigate handler (lines ~26-40): tries `fetch(request)`, catches failure, falls back to `matchPrecache("offline.html")`. This is where the network-first-with-runtime-cache logic would go, likely via `workbox-strategies`'s `NetworkFirst` (already have `workbox-precaching`/`workbox-routing` as devDependencies; would need to add `workbox-strategies` and probably `workbox-cacheable-response` to only cache successful 200 responses).
- `app/routes/auth/logout.tsx` — where the new cache should get cleared, alongside `clearAllOfflineData()`.
- `app/lib/offline-store.client.ts` — existing `clearAllOfflineData()` pattern to mirror for the new cache's cleanup.
- `README.md` — "Offline / Local-first" section documents the current `offline.html`-is-static-only decision; needs updating once this changes.
- `vite.config.ts` — `VitePWA()` config, `injectManifest.globPatterns` (currently `["**/*.{js,css,woff2}", "offline.html"]`) — probably doesn't need changes since this would be a _runtime_ cache, not precached.
- Scope: match the existing feature's scope — home + list routes only. Auth/other routes should never get their HTML cached (session-sensitive, and were explicitly out of scope for offline support in the original plan).

## Open questions for the planning pass

- Which specific routes' navigations should be network-first-cached — just `/` and `/lists/:list`, or should it use the same route-matching the SW already does (currently matches _all_ navigations)? Caching auth-adjacent navigations (`/login`, `/logout`) would be actively wrong.
- Cache size/eviction — Workbox's `NetworkFirst` supports an `expiration` plugin (max entries / max age); worth bounding this since visited-list-count could grow unbounded over a long session.
- Should this cache also get cleared proactively when `clearAllOfflineData()`-equivalent conditions happen elsewhere (not just logout), e.g. account switching?
- Testing: how to verify in Playwright — likely needs a new case in `integration-tests/offline.spec.ts` (warm a page online, go offline, hard-reload, assert the _actual_ cached content shows, not `offline.html`'s "You're offline" heading).
