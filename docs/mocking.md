# Mocking strategy

The app has no test database. All environments that don't use the real Supabase project — local development, e2e tests, and Netlify deploy previews — share the same in-memory mock stack.

## Stack overview

```
mocks/db.ts        — in-memory collections (users, lists, list_items, list_members, waitlist)
mocks/handlers.ts  — MSW request handlers that read/write those collections
mocks/seed.ts      — populates the DB with two users and their starter data
mocks/server.ts    — Node HTTP server (port 9001) used for local dev and e2e
```

## How it works in each environment

### Local development (`pnpm dev --mode mock`)

`mocks/server.ts` starts on port 9001. It:

1. Seeds the DB with a fixed owner (`owner@test.com`) and collaborator (`collab@test.com`).
2. Sets up MSW to intercept `fetch()` calls inside the Node process — so every Supabase API call the React Router server makes hits an MSW handler instead of the network.
3. Exposes a plain HTTP server that proxies incoming requests through MSW, making it reachable from the Vite dev server via `VITE_SUPABASE_URL=http://localhost:9001`.

### E2e tests (`pnpm exec playwright test`)

Same `mocks/server.ts` on port 9001, but test isolation is handled through:

- **UUID-namespaced users**: `createTestContext()` in `e2e/helpers.ts` generates unique `owner-{uuid}@test.com` / `collab-{uuid}@test.com` emails per test.
- **Per-test DB reset**: the `ctx` fixture in `e2e/fixtures.ts` calls `POST /test/reset` before each test, which clears and re-seeds only the data for that test's users. The shared DB is never fully wiped, so parallel workers (`fullyParallel: true`) each operate on their own slice of data without interference.

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

| File | Purpose |
|---|---|
| [mocks/db.ts](../mocks/db.ts) | `@msw/data` Collections — one per Supabase table. Valibot schemas are checked against `database.types.ts` at typecheck time so mock drift is caught early. |
| [mocks/handlers.ts](../mocks/handlers.ts) | Shared MSW handlers for auth (`/auth/v1/*`) and REST API (`/rest/v1/*`). Auth uses the email as the bearer token so any password works. |
| [mocks/seed.ts](../mocks/seed.ts) | Creates two users with lists and a collaborator relationship. Accepts email overrides so e2e tests can seed isolated namespaced users. |
| [mocks/server.ts](../mocks/server.ts) | Starts MSW in the Node process and wraps it in an HTTP server on port 9001. Exposes `POST /test/reset` for per-test isolation. |
| [e2e/helpers.ts](../e2e/helpers.ts) | `createTestContext()` generates UUID-namespaced emails. `resetDb()` posts to `/test/reset`. `login()` drives the login form. |
| [e2e/fixtures.ts](../e2e/fixtures.ts) | Playwright `ctx` fixture that calls `resetDb` before each test. Import `test` and `expect` from here, not from `@playwright/test`. |

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
