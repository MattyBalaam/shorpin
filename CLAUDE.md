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

A `PostToolUse` hook (`.claude/hooks/post-edit-checks.sh`) runs after every `Write`, `Edit`, or `NotebookEdit` on a file inside the project. For JS/TS files it runs `pnpm typecheck` and lints the edited file, and blocks with the errors if either fails. It then formats only the edited file, so files you have open aren't rewritten behind you.

These hooks are helpful but not sufficient on their own in every agent runtime. Some edit paths, especially patch-based ones, may not trigger them reliably.

### PreToolUse — before every `git commit`

A `PreToolUse` hook (`.claude/hooks/pre-commit-checks.sh`) runs before a Bash command that runs `git commit`. It runs **before the whole command**, so it sees the index as it is at that moment:

- **Stage and commit in separate Bash calls.** A command that stages (`git add`, `stash`, `reset`, `commit -a`…) and commits is refused, because the checks would miss what actually gets committed.
- It formats the staged files and re-stages only those. A staged file that also has unstaged changes isn't re-staged; if it needs formatting, the commit is refused so you can fix it.
- It runs the integration specs that the staged files map to (the `case` block in the script is the source of truth). Any file without a mapping runs the full suite. Tests run with one retry; a test that only passed on retry is named in the result instead of blocking the commit.
- On failure, the reason names the failing tests and the path to the full log.

Typecheck, lint and the format check run in the repo-managed Git pre-commit hook (`.githooks/pre-commit`, installed by `pnpm install`). It only checks and never rewrites files, and its format check covers staged files only.

**If hooks are not supported** in your environment, run these steps manually before committing:

```sh
pnpm typecheck           # fix any type errors first
pnpm lint                # fix any lint errors
pnpm fmt                 # format changed files
git add <changed files>  # re-stage if fmt modified anything
pnpm test:integration    # run appropriate integration tests
```

Do not commit if tests are failing or if the user has indicated the work is incomplete. Before creating a commit or PR, run `pnpm verify` even if earlier tool hooks appeared to pass.

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
