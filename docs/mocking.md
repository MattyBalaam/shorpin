# Mocking strategy

The app has no test database. All environments that don't use the real Supabase project — local development, e2e tests, and Netlify deploy previews — share the same in-memory mock stack.

## Stack overview

```
mocks/db.ts        — in-memory collections (users, lists, list_items, list_members, waitlist)
mocks/handlers.ts  — MSW request handlers that read/write those collections
mocks/seed.ts      — populates the DB with two users and their starter data
mocks/server.ts    — Node HTTP server used for local dev and e2e
```

## How it works in each environment

### Local development (`pnpm dev`)

`mocks/server.ts` starts on port 9001 (default). It:

1. Seeds the DB with a fixed owner (`owner@test.com`) and collaborator (`collab@test.com`).
2. Sets up MSW to intercept `fetch()` calls inside the Node process — so every Supabase API call the React Router server makes hits an MSW handler instead of the network.
3. Exposes a plain HTTP server that proxies incoming requests through MSW, making it reachable from the Vite dev server via `VITE_SUPABASE_URL=http://localhost:9001`.

The port is read from `MOCK_SERVER_PORT` env var (default `9001`), so it can be overridden without code changes.

### E2e tests (`pnpm test:e2e`)

`pnpm test:e2e` runs [`scripts/test-e2e.mjs`](../scripts/test-e2e.mjs), which finds free ports starting from `9001` (mock) and `5174` (app) before starting Playwright. This prevents port conflicts when `pnpm dev` or another test run is already using those ports.

Playwright passes the chosen ports to both web servers as `MOCK_SERVER_PORT` / `APP_SERVER_PORT` env vars. The app is built with `react-router build --mode mock` before being served via `react-router-serve`, with `VITE_SUPABASE_URL=http://localhost:${mockPort}` baked in at build time so it always points at the correct mock instance. The `PORT` env var controls which port the production server listens on. A `timeout` of 120 s is set on the app webServer entry to accommodate the build step.

Test isolation is handled through:

- **UUID-namespaced users**: `createTestContext()` in `e2e/helpers.ts` generates unique `owner-{uuid}@test.com` / `collab-{uuid}@test.com` emails per test.
- **Per-test DB reset**: the `ctx` fixture in `e2e/fixtures.ts` calls `POST /test/reset` before each test, which clears and re-seeds only the data for that test's users. The shared DB is never fully wiped, so parallel workers (`fullyParallel: true`) each operate on their own slice of data without interference.
- **User-scoped slug conflict checks**: the slug prefix query (used when creating a list to find an available slug) is scoped to the requesting user's `user_id`, preventing parallel workers from inflating each other's slug counters.

The mock server handles `SIGTERM` and `SIGINT` gracefully, closing its HTTP listener before exiting. This ensures Playwright's webServer teardown (and Ctrl+C in local dev) does not leave orphaned processes holding the port.

### Netlify deploy previews (`pnpm build:preview`)

MSW runs server-side inside the Netlify Function via `entry.server.tsx`:

```ts
if (import.meta.env.MODE === "preview") {
  const { setupServer } = await import("msw/node");
  const { handlers } = await import("../mocks/handlers");
  // ...
  server.listen({ onUnhandledRequest: "bypass" });
  await seed();
}
```

The function intercepts all Supabase calls before they hit the network, so no real Supabase project is needed for a deploy preview. State lives in memory for the lifetime of the warm function instance.

## Key files

| File                                            | Purpose                                                                                                                                                                                                                                                         |
| ----------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [mocks/db.ts](../mocks/db.ts)                   | `@msw/data` collections — one per Supabase table. Valibot schemas are checked against `database.types.ts` at typecheck time so mock drift is caught early.                                                                                                      |
| [mocks/handlers.ts](../mocks/handlers.ts)       | Shared MSW handlers for auth (`/auth/v1/*`) and REST API (`/rest/v1/*`). Auth uses the email as the bearer token so any password works. Slug prefix checks are scoped to the requesting user to prevent parallel test workers from interfering with each other. |
| [mocks/seed.ts](../mocks/seed.ts)               | Creates two users with lists and a collaborator relationship. Accepts email overrides so e2e tests can seed isolated namespaced users.                                                                                                                          |
| [mocks/server.ts](../mocks/server.ts)           | Starts MSW in the Node process and wraps it in an HTTP server. Port is read from `MOCK_SERVER_PORT` (default `9001`). Exposes `POST /test/reset` for per-test isolation. Shuts down cleanly on SIGTERM/SIGINT.                                                  |
| [scripts/test-e2e.mjs](../scripts/test-e2e.mjs) | Port-finding wrapper that probes for free ports before starting Playwright, so concurrent runs never collide.                                                                                                                                                   |
| [e2e/helpers.ts](../e2e/helpers.ts)             | `createTestContext()` generates UUID-namespaced emails. `resetDb()` posts to `/test/reset`. `login()` drives the login form and waits for React hydration at `/` before returning.                                                                              |
| [e2e/fixtures.ts](../e2e/fixtures.ts)           | Playwright `ctx` fixture that calls `resetDb` before each test and forwards browser console / page errors to stdout. Import `test` and `expect` from here, not from `@playwright/test`.                                                                         |

## Schema contract checks

`mocks/db.ts` includes a compile-time assertion that each mock schema is assignable to the corresponding Supabase `Tables<"...">` type:

```ts
void ({
  lists: true,
  // ...
} satisfies {
  lists: InferOutput<typeof listsSchema> extends Partial<Tables<"lists">> ? true : false;
  // ...
});
```

If a column is added to the real schema and the mock is not updated, `pnpm typecheck` fails. This prevents silent divergence between mock and production.

## What is not mocked

- **Realtime WebSocket connections** — the app subscribes to Supabase Realtime channels for live list updates, but the mock server does not implement a WebSocket endpoint. The `onUnhandledRequest` config silently ignores `/realtime/` requests. The HTTP broadcast endpoint (`POST /realtime/v1/api/broadcast`) is handled so broadcasts sent by the server don't error, but clients will not receive real-time pushes in mock mode.
