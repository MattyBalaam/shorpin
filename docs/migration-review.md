# HTML-first spike: review log

`spike/html-first`, branched from `main` (React Router 8). The same app, rebuilt so the server renders HTML and the browser runs only small, optional scripts. Judgement calls are marked **Review**.

## Result

- Every core flow passes with JavaScript off: the `no-js` Playwright project covers sign in and out, list creation, adding, tagging, editing, deleting and recreating items, reordering, grouping, styles, colours, colour scheme, sharing and deleting a list.
- All 122 integration tests pass (two consecutive full runs) across the no-js, desktop, touch (Pixel 7), WebKit and visual projects. 92 unit tests pass.
- Shipped JS (brotli): 1.8 KB on auth pages, 4.4 KB on home, 4.7 KB on a list. The Solid spike's home loaded 98.3 KB. CSS is one 7.2 KB file.

## Stage 1: server and build

- Replaced `app/` with `server/` (Hono on Node 24), `client/` (browser scripts, styles, service worker) and `lib/` (code both sides share: palette, item tags, slugify, cookies).
- The server is plain TypeScript run by Node's type stripping. There's no server build, no JSX and no bundler on the server.
- Vite builds browser assets only, plus a separate single-file build for the service worker. The server reads Vite's manifest to link hashed files.
- **Review:** templates are Hono's `html` tagged template rather than JSX. Interpolated strings are escaped, and the server stays build-free. The cost is no type checking of markup or attributes.
- **Review:** env var names keep their `VITE_` prefix so `.env` files, CI secrets and Docker build args work unchanged, though nothing is baked into a bundle now. In the Docker image, build args become runtime env.
- `scripts/install-git-hooks.mjs` now skips linked worktrees, where `.git` is a file. The installer used to crash `pnpm install` there.

## Stage 2: styles

- Compiled the 30 Vanilla Extract files once, with readable identifiers, into `client/styles/app.css` (classes like `item-row`, variables like `--palette-primary`). Then I removed Vanilla Extract.
- The compile followed glob order, not the original import order. That put `.button` after the component rules that refine it, so it was moved back to the top (round delete buttons were square until then).
- `html-first.css` holds what's new: route-dialog fallback, ↑/↓ reorder buttons, scroll-snap swipe, self-dismissing notifications, view transitions, and a scroll-driven-animation fallback for scroll shadows.
- **Review:** one stylesheet for every page (7.2 KB brotli), as the Solid spike settled on too.

## Stage 3: pages and forms

- Every interaction is a form post that redirects (303) or re-renders with a 422. Flash messages ride a one-shot cookie.
- Dialog routes keep their URLs and render over their parent page. Without JS they're a non-modal `dialog[open]` styled as the modal; `base.ts` upgrades them to `showModal()`.
- In-page dialogs (edit item, colours) open with invoker commands, so they need no script.
- The tag combobox became `<input list>` + `<datalist>`.
  - **Review:** this loses "show every tag with the current one ticked", the `Add "…"` row and custom styling. The custom combobox tests were rewritten for the datalist.
- Colours: Shuffle is a link that re-renders with a new candidate, and "Use these colours" is a post. Generating happens on the server.
- Linkify runs on the server, so no script ships for it.
- **Review:** the CSRF check is `Sec-Fetch-Site` only (same-origin or none for non-GET). It needs no tokens and no origin allow-list behind the proxy. A request without the header (old browsers, curl) passes, as it does in Hono's own `csrf()` helper.

## Stage 4: list mutations

- `POST /lists/:list/items` with `op=add|edit|delete|recreate|move|group|palette`. Each op writes only the rows it names, directly through PostgREST under the existing RLS policies. `mutate_list` is no longer called.
- **Review:** I first planned to apply each op to a fresh read of the list and then call `mutate_list`. That RPC deletes whatever is missing from the submitted array, so two members adding at the same moment could delete each other's items. Per-row writes avoid that and make the three-way offline rebase (`offline-merge.ts`) unnecessary.
- **Review (accepted race):** an op reads, then writes. Two concurrent moves can interleave into an odd order; nothing gets deleted.
- Adds carry a form-generated id and insert with "ignore duplicates", so a replayed or double-submitted add is a no-op. The mock gained `resolution=ignore-duplicates` support and palette updates by id.
- "Recreate last deleted" is now URL state (`?deleted=<id>`), not React state. It appears once the delete has saved, not optimistically. **Review:** the test that clicked it mid-save ("Still saving…") was replaced.

## Stage 5: enhancements

- **No-reload saves** (`submit.ts`):
  - posts with `fetch`, follows the server's 303 and swaps `data-swap` regions inside a view transition
  - sends posts in order
  - hides a row at once on delete and shows a "saving…" row on add
  - keeps `?tag=` out of the address bar, so a reload starts without a tag, as before
- **Live updates:** server-sent events from an in-process pub/sub, replacing the Supabase realtime client in the browser.
  - **Review:** this assumes one server process (true for the Coolify container). Scaling out needs Supabase broadcast or `LISTEN/NOTIFY` behind the same `publish()`.
- **Drag to reorder:** native HTML drag and drop from the grip (`draggable="true"` in the markup; deciding it in `pointerdown` is too late for Chromium). Drops post "move this after that".
  - **Review:** there are no spring or FLIP animations; view transitions move rows instead.
  - **Review:** on touch screens the ↑/↓ buttons stay visible, because touch drag and drop depends on the browser's long-press support and can't be tested in Playwright. The touch tests now cover the buttons and the scroll-snap swipe.
- **Swipe to delete** is horizontal scroll snapping onto a Delete button (coarse pointers only). The browser handles momentum, so a quick flick carries on to Delete.
- **Notifications:** server-rendered, with CSS auto-dismiss paused by focus.
  - **Review:** it isn't paused by hover. CSS `:hover` applied whenever the cursor happened to rest over the panel after a navigation, so it never cleared.
  - Scripts keep a small stack (newest first, "+N more", Clear all). The panel isn't swapped; a flash in a swapped-in page joins the stack.
- **Ready signal:** `data-hydrated-path` (which the tests wait on) is set once modules have run and any incoming cross-document view transition has finished. That needs a one-line inline `pagereveal` listener in `<head>`, because it fires before deferred modules.

## Stage 6: offline

- The service worker caches home and list pages network-first, plus the hashed assets, and falls back to `offline.html`. It's hand-written now; Workbox and vite-plugin-pwa are gone.
- One IndexedDB queue of form posts serves both paths:
  - **With JS:** the page queues a failed post itself (even before the worker controls the page, a race the first version lost), applies the change locally, and replays with backoff on reconnect and on load.
  - **Without JS:** the worker queues the post and answers with a "saved on this device" page.
  - **No page open:** Background Sync replays.
- Replays carry `X-Replay` so the worker doesn't queue them twice.
- A replay meeting a lapsed session keeps the queue and sends the page to sign in. **Review:** home used to stay put with a pending row; now home and list behave the same.
- Sign-out uses `Clear-Site-Data: "cache", "storage"` instead of client code clearing caches and IndexedDB.

## Stage 7: tests

- Tests kept their role and label selectors; most passed once their URL matchers changed (`/lists/shopping/items` instead of `/lists/shopping.data`, `/default-list` instead of `/_.data`).
- Rewritten because they described React-only behaviour:
  - the combobox
  - pointer swipe and fling (now scroll snap)
  - SPA error modals (now the offline page)
  - the stale-fetch rebase test (now removed, along with the rebase)
- `page.route` doesn't see requests once the service worker controls the page, so the lie-fi tests use `context.route`.
- **Review:** two tests got a pixel's tolerance where the scroll range rounds down: one about scrolling into view, one about scroll edges.
- **Review:** the notification auto-dismiss test polls with `page.evaluate`. Polled through the role locator, the delayed CSS animation never finished in Chromium.
- `login()` now clears the "Welcome back!" notification and waits for the panel to close. Left alone, it collapsed 5s in and shifted the rows under tests that were mid-drag or mid-screenshot, which made two home tests intermittent.
- Visual baselines were regenerated. They match the React app apart from a hover artefact (now prevented by parking the mouse) and the date format: the server renders `en-GB` where the browser used to render its own locale.

## Open

- **Test on a real iPhone and Android phone:** long-press drag to reorder, and scroll-snap swipe.
- **Docker image not built locally** (no Docker daemon available).
- **Sentry and performance beacons not ported.**
- **No "saving…"/"edited" marker on edits.**
- **Queued adds can't be edited until synced.**
- **Real-Supabase e2e not run** (`pnpm test:e2e` needs `.env.test.local`). Its config now builds and starts the new server.
