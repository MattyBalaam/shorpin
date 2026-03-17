# E2E Tests

E2E tests run against a real Supabase instance. They test actual database operations, authentication, and real-time features that cannot be mocked.

## Running tests

```
pnpm test:e2e
```

## Configuration

The tests use `playwright.supabase.config.ts` which:

- Uses the real Supabase project (from `.env`)
- Runs a single worker to avoid database conflicts
- Sets up test data via `supabase-setup.ts` before each run
- Cleans up via `supabase-teardown.ts` after the run

## Test files

| File                     | What it covers                       |
| ------------------------ | ------------------------------------ |
| `supabase-smoke.spec.ts` | Basic Supabase connectivity and auth |
