# E2E Tests

E2E tests run against a real Supabase instance. They test actual database operations, authentication, and real-time features that cannot be mocked.

## Setup (local)

Copy [.env.test.local.example](../.env.test.local.example) to `.env.test.local` (gitignored) and fill in the **test** Supabase project's URL, publishable key, and service role key. This file is the single source of truth for the test project — `test:e2e` and `dev:e2e` both read it automatically, so there's no need to hand-edit `.env` or toggle between projects.

## Running tests

```
pnpm test:e2e
```

To run the app itself (not just the tests) against the test Supabase project — e.g. to poke around manually instead of using the mock server — use:

```
pnpm dev:e2e
```

## Configuration

The tests use `playwright.supabase.config.ts` which:

- Loads `.env.test.local` first, falling back to `.env` for anything it doesn't set (e.g. `SESSION_SECRET`). In CI neither file exists; `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are injected directly as secrets in `.github/workflows/ci.yml`'s `e2e-supabase` job instead.
- Runs a single worker to avoid database conflicts
- Sets up test data via `supabase-setup.ts` before each run
- Cleans up via `supabase-teardown.ts` after the run

## Test files

| File                     | What it covers                       |
| ------------------------ | ------------------------------------ |
| `supabase-smoke.spec.ts` | Basic Supabase connectivity and auth |
