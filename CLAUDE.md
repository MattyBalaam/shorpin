# Claude Code Guidelines

Follow the code patterns defined in [CONTRIBUTING.md](CONTRIBUTING.md).

## Agent behaviour

- Add any existing architectural decisions and overall app structure to the README.md file.
- Commit changes to git after every instruction with brief commit notes consisting of brief overview title and maximum of 8 bullet points.
- Before committing run `pnpm typecheck` and make sure there are no type issues.
- Before committing, run e2e tests based on the scope of the change:
  - CSS, types, docs, or config only: no e2e required
  - A specific route or component: run the relevant e2e file (e.g. `pnpm exec playwright test e2e/home.spec.ts`)
  - Shared infrastructure (mocks, handlers, seed, helpers, fixtures): run the full suite (`pnpm exec playwright test`)

## Scripts

Use the project's pnpm scripts instead of direct commands:

- `pnpm typecheck` - Run TypeScript type checking (not `npx tsc`)

Always use `pnpx` instead of `npx` for running package binaries.
