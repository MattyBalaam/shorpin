# Claude Code Guidelines

Follow the code patterns defined in [CONTRIBUTING.md](CONTRIBUTING.md).

## Stack

React Router v7 SSR · TypeScript · Vanilla Extract · Playwright · pnpm · Supabase

## Communication

- Keep replies concise but complete.
- Voice concerns before proceeding, even on direct requests. If there was a solid reason for a previous approach (e.g. avoiding duplication), push back with reasoning instead of silently complying.

## Code style

- Use modern platform APIs. Target the latest version of each major browser — no polyfills needed.
- Prefer web standards and "use the platform" unless a third-party library solves something the platform cannot.
- Document new architectural decisions in [README.md](README.md) before committing.

## Pre-commit checks

A `PreToolUse` hook (`.claude/hooks/pre-commit-checks.sh`) runs automatically before every `git commit`. It:

1. Runs `pnpm typecheck` — blocks the commit if there are type errors
2. Runs `pnpx oxfmt` — formats files in place, then blocks if any files changed (so you can re-stage them before retrying)

**If hooks are not supported** in your environment, run these steps manually before committing:

```sh
pnpm typecheck           # fix any type errors first
pnpx oxfmt               # format changed files
git add <changed files>  # re-stage if oxfmt modified anything
```

### E2e tests (always manual — requires scope judgement)

Run after the above, based on what changed:

| Change scope                                            | Command                                        |
| ------------------------------------------------------- | ---------------------------------------------- |
| CSS, types, docs, config only                           | skip                                           |
| A specific route or component                           | `pnpm exec playwright test e2e/<name>.spec.ts` |
| Shared infra (mocks, handlers, seed, helpers, fixtures) | `pnpm exec playwright test`                    |

Do not commit if tests are failing or if the user has indicated the work is incomplete.

## Scripts

Always use `pnpx` instead of `npx`. Use pnpm scripts over direct tool commands:

- `pnpm typecheck` — TypeScript type checking
