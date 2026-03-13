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

## Hooks

### PostToolUse — after every file edit

A `PostToolUse` hook (`.claude/hooks/post-edit-checks.sh`) runs automatically after every `Write`, `Edit`, or `NotebookEdit`. It:

1. Runs `pnpm typecheck` — blocks if there are type errors
2. Runs `pnpm lint` — blocks if there are lint errors
3. Runs `pnpm fmt` — formats files in place

### PreToolUse — before every `git commit`

A `PreToolUse` hook (`.claude/hooks/pre-commit-checks.sh`) runs automatically before every `git commit`. It:

1. Runs `pnpm typecheck`, `pnpm lint`, `pnpm fmt` (same as above)
2. Runs scoped e2e tests based on what is staged:

| Staged files                                                                                      | E2e action                                                       |
| ------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Only `*.css.ts`, `*.d.ts`, `*.md`, `.claude/**`                                                   | Skip                                                             |
| Any `mocks/**`, `app/lib/**`, `public/**`, `app/root.*`, `app/routes/app/**`, `app/components/**` | Full suite (`pnpm test:e2e`)                                     |
| `app/routes/home*`                                                                                | `e2e/home.spec.ts`                                               |
| `app/routes/list*`                                                                                | `e2e/list.spec.ts` + `e2e/delete.spec.ts` + `e2e/config.spec.ts` |
| `app/routes/delete*`                                                                              | `e2e/delete.spec.ts`                                             |
| `app/routes/auth/**`                                                                              | `e2e/auth.spec.ts`                                               |
| `app/routes/sign-ups*`                                                                            | `e2e/sign-ups.spec.ts`                                           |
| `e2e/*.spec.ts` changed                                                                           | That spec                                                        |
| Anything else unmatched                                                                           | Full suite (safe fallback)                                       |

**If hooks are not supported** in your environment, run these steps manually before committing:

```sh
pnpm typecheck           # fix any type errors first
pnpm lint                # fix any lint errors
pnpm fmt                 # format changed files
git add <changed files>  # re-stage if fmt modified anything
pnpm test:e2e            # run appropriate e2e tests
```

Do not commit if tests are failing or if the user has indicated the work is incomplete.

## Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/) with this format:

```
<type>(<scope>): <subject>

- <bullet point description>
- <another bullet point>

Closes #<issue>
```

Types: `feat`, `fix`, `refactor`, `perf`, `docs`, `chore`, `test`, `style`, `revert`

Guidelines:

- Keep subject under 50 characters
- Use imperative mood: "Add feature" not "Added feature"
- Explain "what" and "why", not "how"
- Use `!` after type for breaking changes: `feat(api)!:` or include `BREAKING CHANGE:` footer
- Group changes by intent (e.g., don't mix refactors with new features)

## Scripts

Always use `pnpx` instead of `npx`. Use pnpm scripts over direct tool commands:

- `pnpm typecheck` — TypeScript type checking
- `pnpm lint` — oxlint (enforces rules such as no non-null assertions)
- `pnpm fmt` — oxfmt formatter
