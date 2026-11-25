# @shorpin/html-first

The same app as [React Router](../react-router), rebuilt so the browser gets HTML and CSS, and JavaScript only where it earns its place. Every core flow works with JavaScript turned off; scripts add saves without reloads, live updates, drag to reorder and offline editing. Imported from the `spike/html-first` branch (#172), whose decisions are logged in [docs/spike-review.md](docs/spike-review.md); see the root [README](../../README.md#monorepo) for how the apps share specs, mocks and the database.

- **Server**: [Hono](https://hono.dev) on Node 24, plain TypeScript run by Node's type stripping (no server build step)
- **Templates**: Hono's escaping `html` tagged template
- **Client**: no framework. One stylesheet and three small enhancement scripts, bundled by Vite
- **Styling**: plain CSS (compiled once from the Vanilla Extract sources)
- **Data**: Supabase (the shared schema, RLS and mock server)

## Environment and scripts

The server reads its settings from the environment at runtime; nothing is baked into a browser bundle. The variable names keep their `VITE_` prefix from the React app so `.env` files, CI secrets and Docker build args carry over.

| File                              | Used by                         | Notes                                                                                       |
| --------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------- |
| `.env.mock`                       | `dev`, `dev:mock`, `build:mock` | Points at the shared mock server (`@shorpin/mocks`) and sets `APP_MODE=mock` (quick-login). |
| `.env.preview`                    | `build:preview`                 | Copied to `dist/runtime.env`: Supabase is the in-process mock (PR previews).                |
| `.env` (copy from `.env.example`) | `dev:supabase`, `start`         | Real Supabase project credentials.                                                          |

- `pnpm --filter @shorpin/html-first dev` runs the mock Supabase, Vite rebuilding the browser assets on change, and the server restarting on change (`node --watch`). Open http://localhost:3000.
- `build` builds the browser assets into `dist/`; `start` runs the server from source. `build:mock` and `build:preview` also ship an env file as `dist/runtime.env`, which the server applies for anything the environment leaves unset ([server/env.ts](server/env.ts)).
- **Preview images bundle the mock.** `pnpm deploy` copies `@shorpin/mocks` into `node_modules`, where Node won't strip TypeScript, so `build:preview` bundles the parts preview mode uses into `dist/preview-mocks.js` ([vite.preview.config.ts](vite.preview.config.ts)). [server/mocks.ts](server/mocks.ts) loads that bundle when it exists, else the source.

## HTML-first architecture

### The shape of it

- **The server renders every page.** `server/routes/*.ts` are Hono routes; `server/views/` holds the shared markup. There is no client-side rendering and no hydration: the markup is the app.
- **Every change is a form post.** A `<form method="post">` hits a route, the route does the work and answers `303` back to the page (or re-renders it with errors and a `422`). Messages for the next page ride in a one-shot cookie ([server/flash.ts](server/flash.ts)).
- **Scripts only enhance.** Each page gets [base.ts](client/enhance/base.ts); home and list add one more. Turn JavaScript off and everything still works, more slowly: the `no-js` Playwright project ([no-js.spec.ts](../../packages/specs/integration-tests/app-only/html-first/no-js.spec.ts)) proves the core flows that way.
- **Vite builds browser assets only** ([vite.config.ts](vite.config.ts), plus [vite.sw.config.ts](vite.sw.config.ts) for the service worker). The server reads `dist/.vite/manifest.json` to link the hashed files ([server/assets.ts](server/assets.ts)).

### What ships

Measured from `pnpm build`, brotli-compressed. The Solid spike's home page loaded 98.3 KB of JS across 31 files (see `spike/tanstack-solid`'s migration review).

| Page           | JS (brotli)      | CSS (brotli) | Without JS |
| -------------- | ---------------- | ------------ | ---------- |
| Sign in & auth | 1.8 KB (2 files) | 7.2 KB       | Works      |
| Home           | 4.4 KB (4 files) | 7.2 KB       | Works      |
| List           | 4.7 KB (4 files) | 7.2 KB       | Works      |
| Service worker | 1.4 KB           |              |            |

A list of 30 items is about 110 KB of HTML (7 KB gzipped): each row carries its own small forms and edit dialog, which is what lets it work without a script. Template indentation is collapsed at render ([server/html.ts](server/html.ts)) and the per-row icons come from one SVG sprite.

### Platform features doing the work

| Feature                                    | How                                                                                                                                                                                                                 |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dialog routes (`/style`, `/config/:list`…) | The parent page rendered with an open `<dialog>`. Without JS it's a non-modal `dialog[open]` styled like the modal; base.ts upgrades it with `showModal()`. Close buttons are invoker commands (`command="close"`). |
| Edit item, colours                         | A `<dialog>` per row opened by an **invoker command** (`commandfor` + `command="show-modal"`): no script.                                                                                                           |
| Tag picker                                 | `<input list>` + one shared `<datalist>` of the list's tags, in place of the custom combobox. The server folds the tag into the value (`[tag]`, [lib/item-tag.ts](lib/item-tag.ts)).                                |
| Reorder                                    | ↑/↓ submit buttons per row (the no-script and keyboard route). With JS, the grip is native HTML drag and drop ([reorder.ts](client/lib/reorder.ts)); the buttons stay visible on touch screens.                     |
| Swipe to delete                            | Each row is a horizontal `scroll-snap` container onto a Delete submit button (coarse pointers only). The browser does the gesture, momentum and snapping.                                                           |
| Notifications                              | Server-rendered into a `role="status"` panel. Successes clear themselves with a CSS animation, paused while the panel has focus. Script-made ones (live updates, offline) use the same markup.                      |
| Page-to-page animation                     | Cross-document view transitions (`@view-transition { navigation: auto }`). Rows have their own `view-transition-name`, so a reorder slides them into place even after a full page load.                             |
| Scroll shadows                             | `scroll-state()` container queries, with a **scroll-driven animation** fallback (Safari, Firefox) instead of the React app's script.                                                                                |
| Light/dark                                 | A form post setting a cookie; base.ts applies it in place so it also works offline. All colours are `light-dark()`.                                                                                                 |
| Open link                                  | Found by linkify on the server; no script ships for it.                                                                                                                                                             |
| CSRF                                       | Non-GET requests must be `Sec-Fetch-Site: same-origin` (or `none`), so no tokens in forms and no allow-list of origins behind the TLS-terminating proxy.                                                            |

### The scripts

- **No-reload saves** ([submit.ts](client/lib/submit.ts)): forms marked `data-enhance` post with `fetch`. The server answers exactly as it would without a script (a `303`), fetch follows it, and the returned page's `data-swap` regions replace the current ones ([swap.ts](client/lib/swap.ts)) inside a view transition. Focus, scroll and half-typed input stay put. Posts go one at a time, in order. Deletes and adds show at once (a hidden row, a "saving…" placeholder) until the server's page arrives.
- **Live updates** ([list.ts](client/enhance/list.ts)): an `EventSource` on `/lists/:list/events`. After any change the server publishes to an in-process pub/sub ([server/realtime.ts](server/realtime.ts)); other members' pages re-fetch themselves. The browser no longer loads the Supabase realtime client. One Node process serves the app, so a `Map` is the whole pub/sub; more instances would need a shared channel (Supabase broadcast or Postgres `LISTEN/NOTIFY`) feeding the same `publish()`.
- **Catching up**: changes aren't redelivered, so the page refreshes itself when the tab becomes visible again or is restored from the back/forward cache. The list renders the time of its newest change (`data-version`); a stream that opens (or reconnects, sending `Last-Event-ID`) behind the list's current version gets a silent `stale` event and refreshes.
- **"New" markers last the visit.** Opening a list records the view and keeps the previous view's time in a cookie for the list's pages (`shorpin-visit`), so saves and refreshes during the visit don't clear the markers.
- **`?enhanced`**: a script's fetch of a page (a refresh, or the redirect after an enhanced post) carries it, so it can be told apart from a navigation ([lib/enhanced.ts](lib/enhanced.ts)). It never reaches the address bar.
- **Offline**: see below.

### List mutations: one row per post

`POST /lists/:list/items` takes `op=add|edit|delete|recreate|move|group|palette` and the item it acts on. Each op writes only the rows it names, with direct PostgREST writes under the existing RLS policies. The `mutate_list` RPC is no longer used.

- The RPC soft-deleted whatever was missing from a submitted copy of the whole list. That's why the React app needed a three-way rebase before replaying offline edits, and it would let two people adding at the same moment delete each other's items if the server fed it a freshly read list.
- Adds carry an id made with the form (a hidden field, renewed by submit.ts), inserted with "ignore duplicates", so posting the same add twice is a no-op.
- **The bin** (`/lists/:list/bin`, opened from the add bar) is a route dialog listing the ten most recent deletions. Undelete is a plain post of the `recreate` op, which re-adds the value as a new item, so it works without a script and the redirect closes the dialog. Values already back on the list are left out, and repeats show once.
- A reorder writes only the rows whose position changed; concurrent reorders are last-write-wins per row.
- Accepted race: an op reads the list, then writes. Two moves at the same instant can interleave; nothing is ever deleted by it.

### Offline

- **Pages**: the service worker ([client/sw.ts](client/sw.ts)) keeps the last good copy of home and each list (network first), plus the hashed assets, and serves `offline.html` for anything else.
- **Changes**: a list or home post that can't reach the server is kept in IndexedDB ([queue.ts](client/lib/queue.ts)) and replayed in order. With a script the page queues it (whether or not the worker is in control yet), shows the change locally and replays it when the connection returns, retrying with backoff. Without a script the worker queues the post and answers with a short "saved on this device" page. Background Sync replays when no page is open. A replay that meets a lapsed session stops, keeps the queue, and sends the page to sign in.
- Each queued op is keyed by id and applied to the server's current state, so replays need no rebase and can't clobber other members' changes.
- Sign-out sends `Clear-Site-Data: "cache", "storage"`, dropping the per-user page cache and queue.

### Styles

`client/styles/app.css` is the React app's Vanilla Extract styles, compiled once with readable names (`item-row`, `--palette-primary`) and checked in as plain CSS; `html-first.css` adds what this version does differently. App styles are still `[data-app-style]` blocks; list palettes are an inline `<style>` setting `--palette-primary`/`--palette-secondary`.

### Known gaps and risks

- **Touch drag and drop is unverified.** It relies on the browser's long-press drag support (iOS Safari 15+, recent Chrome Android), which Playwright can't emulate. The ↑/↓ buttons stay visible on touch screens as the dependable route. Try it on real devices.
- **No Sentry or performance beacons.** The React app's client and server monitoring isn't ported; `/perf` is gone.
- **Edits show no "saving…" or "edited" marker**, and there are no FLIP spring animations: rows move with view transitions instead.
- **Offline edits of a queued add** wait for the sync (the queued row has no edit dialog yet).

- **Swaps replace elements.** A refresh swaps the list in wholesale, closing any open dialog and resetting a half-done swipe, so the page refreshes only when something changed: another member's save, a stream that (re)connects to a newer list, the tab coming back. React Router reconciles a refetch in place instead.
- Remaining differences from React Router are parity gaps, each with its reason, in [packages/specs/apps/html-first.ts](../../packages/specs/apps/html-first.ts).
