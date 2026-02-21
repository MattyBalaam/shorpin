# E2E Tests

End-to-end tests run against the app pointed at a local mock server (MSW on port 9001)
instead of a real Supabase instance.

## Running tests

```
pnpm playwright test          # headless
pnpm playwright test --ui     # interactive UI
pnpm playwright test --headed # headed browser
```

## Architecture

### Mock server (`mocks/server.ts`)

A single Node HTTP server on port 9001 that proxies requests through MSW handlers.
It provides a `/test/reset` endpoint used by tests to seed fresh data before each test.

### Parallel isolation

Each test file calls `createTestContext()` at module scope to generate a unique set of
user emails in the form `{username}-{uuid}@test.com`:

| Field          | Example                                      |
|----------------|----------------------------------------------|
| `ownerEmail`   | `owner-3f2a1b…@test.com`                    |
| `collabEmail`  | `collab-3f2a1b…@test.com`                   |
| `waitlistEmail`| `pending-3f2a1b…@test.com`                  |

`beforeEach` calls `resetDb(page, ctx)` which POSTs the context to `/test/reset`.
The server deletes only that worker's data and re-seeds it, so parallel workers running
different test files never touch each other's records.

### Seed data

Each worker's seed contains:

- **Owner** — 2 lists: `Shopping` (Milk, Bread, Eggs) and `Owner Empty`
- **Collab** — 2 lists: `Collab Shopping` (Coffee, Tea, Sugar) and `Collab Empty`
- Collab is a member of owner's Shopping list
- One pending waitlist entry (first name "Pending", last name "User")

## Test files

| File | What it covers |
|------|----------------|
| `auth.test.ts` | Sign-out flow |
| `config.test.ts` | Admin config modal — open, view collaborators, add collaborator |
| `delete.test.ts` | Soft-delete a list via the config modal |
| `home.test.ts` | Home page — create list, list visibility per role, admin link counts |
| `list.test.ts` | List detail — display items, add item, delete item with undo |
| `sign-ups.test.ts` | Waitlist — pending count badge, modal view, mark as handled |

## Helpers (`helpers.ts`)

| Export | Purpose |
|--------|---------|
| `createTestContext()` | Generate unique `{ownerEmail, collabEmail, waitlistEmail}` for a test file |
| `login(page, email)` | Navigate to `/login` and sign in (mock ignores password) |
| `resetDb(page, ctx)` | POST to `/test/reset` to wipe and re-seed this worker's data |
