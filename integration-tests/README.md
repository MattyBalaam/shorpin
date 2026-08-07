# Integration Tests

Integration tests run against the app pointed at a local mock server (MSW) instead of a real Supabase instance. Both servers start on free ports so concurrent runs never collide.

## Running tests

```
pnpm test:integration                 # headless (finds free ports automatically)
pnpm test:integration --ui            # interactive Playwright UI
pnpm test:integration --headed        # headed browser
pnpm test:integration integration-tests/home.spec.ts  # single file
```

`pnpm test:integration` runs [`scripts/test-integration.mjs`](../scripts/test-integration.mjs) which probes for free ports starting at `9001` (mock) and `5174` (app) before handing off to Playwright. This means you can run tests while `pnpm dev` is already using those ports.

## Architecture

### Mock server (`mocks/server.ts`)

A single Node HTTP server that proxies requests through MSW handlers. The port is read from `MOCK_SERVER_PORT` (default `9001`) so it shifts automatically when the port-finding script picks a different one.

It exposes two endpoints used by tests:

- `GET /` — health check; Playwright polls this before running tests
- `POST /test/reset` — wipe and re-seed data for a given test context (see below)

The server handles SIGTERM and SIGINT gracefully, closing the HTTP listener before exiting. This ensures Playwright's webServer teardown (and Ctrl+C in local dev) does not leave orphaned processes.

### Parallel isolation

Tests run with `fullyParallel: true`. Each test gets its own isolated slice of the shared in-memory DB through three mechanisms:

1. **UUID-namespaced users** — `createTestContext()` generates unique emails per test:

   | Field           | Example                    |
   | --------------- | -------------------------- |
   | `ownerEmail`    | `owner-3f2a1b…@test.com`   |
   | `collabEmail`   | `collab-3f2a1b…@test.com`  |
   | `waitlistEmail` | `pending-3f2a1b…@test.com` |

2. **Per-test DB reset** — the `ctx` fixture calls `POST /test/reset` before each test, which deletes and re-seeds only that worker's users and their data.

3. **User-scoped slug conflicts** — the slug prefix query (used when creating a list to avoid duplicate slugs) is scoped to the requesting user's `user_id`, so one worker creating a "Groceries" list cannot inflate the slug counter of another worker's "Groceries" list.

### Seed data

Each worker's seed contains:

- **Owner** — 2 lists: `Shopping` (Milk, Bread, Eggs) and `Owner Empty`
- **Collab** — 2 lists: `Collab Shopping` (Coffee, Tea, Sugar) and `Collab Empty`
- Collab is a member of owner's Shopping list
- One pending waitlist entry (first name "Pending", last name "User")

### Hydration gate

`login()` in `integration-tests/helpers.ts` waits for the app to hydrate at `/` before returning. The app writes `data-hydrated-path="/"` to `<html>` inside a `useEffect` (client-only) after every route render. The helper asserts that attribute is present within 300ms:

```ts
await expect(page.locator('html[data-hydrated-path="/"]')).toBeAttached({ timeout: 300 });
```

If this fails it means React has not taken over the page within 300ms of navigation — likely a slow-hydration regression — and the test fails with a clear Playwright assertion message rather than a confusing URL mismatch later.

### Debug logging

The `ctx` fixture forwards all browser console messages and uncaught page errors to the test runner's stdout, prefixed with `[browser][type]`. On CI these appear in the Actions log alongside the Playwright webServer output (which is piped via `stdout: "pipe"`).

### Service worker (`offline.spec.ts`)

The current SW (`app/sw.ts`) precaches the app shell and falls back to `public/offline.html` for navigations made with no network — see README.md's "Offline / Local-first" section for the full design. It only registers in production-ish builds (`import.meta.env.PROD`); since the integration tests use `--mode mock` (which Vite treats as a production build), it's active during tests, but only for the default (non-`--dev`) build variant — SW-dependent tests don't run under `pnpm test:integration --dev`.

**Background Sync can't be reliably asserted directly** — headless Chromium (including this test environment) commonly disables it outright (`UnknownError: Background Sync is disabled`), independent of `"SyncManager" in window` reporting `true`. `offline-store.client.ts`'s `enqueueMutation` treats the registration call as strictly best-effort for exactly this reason (wrapped in its own try/catch); the test verifies that property — an offline edit still queues successfully — rather than the registration call's own success, which this environment can't guarantee either way.

**Workbox precache cache keys aren't literal URLs** — non-hashed precached entries (like `offline.html`) get a `?__WB_REVISION__=...` query param appended to their cache key for cache-busting. A plain `caches.match("/offline.html")` misses; `app/sw.ts` uses `workbox-precaching`'s `matchPrecache("offline.html")` instead, which resolves this correctly.

The per-route offline CRUD specs (list.spec.ts's and home.spec.ts's own offline tests) live in their respective files, not here — `offline.spec.ts` is reserved for assertions that need SW/browser-level state (Service Worker registration, Cache Storage) rather than app UI.

## Test files

| File               | What it covers                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------- |
| `auth.spec.ts`     | Sign-out flow                                                                                |
| `config.spec.ts`   | Admin config modal — open, view collaborators, add collaborator                              |
| `delete.spec.ts`   | Soft-delete a list via the config modal                                                      |
| `home.spec.ts`     | Home page — create list, list visibility per role, admin link counts, offline create/reorder |
| `list.spec.ts`     | List detail — display items, add/delete item, offline sync, concurrent-edit rebase           |
| `offline.spec.ts`  | Service worker — registration/precache, offline navigation fallback, Background Sync         |
| `sign-ups.spec.ts` | Waitlist — pending count badge, modal view, mark as handled                                  |

## Helpers (`helpers.ts`)

| Export                | Purpose                                                             |
| --------------------- | ------------------------------------------------------------------- |
| `createTestContext()` | Generate unique `{ownerEmail, collabEmail, waitlistEmail}` per test |
| `login(page, email)`  | Navigate to `/login`, sign in, and wait for hydration at `/`        |
| `resetDb(page, ctx)`  | POST to `/test/reset` to wipe and re-seed this worker's data        |

## CI

On CI (GitHub Actions), the `integration` job runs inside the official Playwright container (`mcr.microsoft.com/playwright`). On failure it:

1. Uploads the HTML report as a `playwright-report` artifact (retained 7 days).
2. Deploys the report to GitHub Pages (`gh-pages` branch) and prints a link to the job summary.

The job requires `permissions: contents: write` (to push to `gh-pages`). GitHub Pages must be configured to deploy from the `gh-pages` branch in repository Settings → Pages.
