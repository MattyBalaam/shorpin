#!/bin/bash
#
# PreToolUse hook — intercepts git commit commands.
# Runs typecheck, lint, formatter, and scoped e2e tests before allowing a commit.
#
# Blocks the commit if:
#   - pnpm typecheck reports type errors
#   - pnpm lint reports lint errors
#   - scoped e2e tests fail
# Formatter changes are auto-staged so retries are not needed.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty')

# Only act on git commit commands
if [[ ! "$COMMAND" =~ git[[:space:]]+commit ]]; then
  exit 0
fi

deny() {
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"%s"}}' "$1"
  exit 0
}

# 1. Typecheck — output goes to stderr so agent sees the errors
if ! pnpm typecheck >&2; then
  deny "Type errors found — see output above. Fix before committing."
fi

# 2. Lint — errors block the commit
if ! pnpm lint >&2; then
  deny "Lint errors found — see output above. Fix before committing."
fi

# 3. Format — modifies files in place, then auto-stage any changes
pnpm fmt >&2
git add -u

# 4. Scoped e2e tests based on staged files (re-read after auto-staging fmt changes)
STAGED=$(git diff --cached --name-only)

# Skip e2e if all staged files are trivial (styles, types, docs, Claude config)
NON_TRIVIAL=$(echo "$STAGED" | grep -vE '(\.css\.ts|\.d\.ts|\.md|\.toml|\.yaml|\.yml)$' | grep -vE '^\.claude/')

if [ -n "$NON_TRIVIAL" ]; then
  # Triggers that require the full suite
  RUN_ALL=$(echo "$STAGED" | grep -mE1 '^(mocks/|app/lib/|public/|app/root\.|app/routes/app/|app/components/)')

  if [ -n "$RUN_ALL" ]; then
    echo "Running full e2e suite (shared infra or layout changed)..." >&2
    if ! pnpm test:e2e >&2; then
      deny "E2e tests failed — see output above. Fix before committing."
    fi
  else
    # Accumulate matching specs
    SPECS=""
    echo "$STAGED" | grep -qE '^app/routes/home'      && SPECS="$SPECS e2e/home.spec.ts"
    echo "$STAGED" | grep -qE '^app/routes/list'     && SPECS="$SPECS e2e/list.spec.ts e2e/delete.spec.ts e2e/config.spec.ts"
    echo "$STAGED" | grep -qE '^app/routes/delete'    && SPECS="$SPECS e2e/delete.spec.ts"
    echo "$STAGED" | grep -qE '^app/routes/auth/'     && SPECS="$SPECS e2e/auth.spec.ts"
    echo "$STAGED" | grep -qE '^app/routes/sign-ups'  && SPECS="$SPECS e2e/sign-ups.spec.ts"
    # Add any changed spec files themselves (exclude supabase-* which needs its own runner)
    CHANGED_SPECS=$(echo "$STAGED" | grep -E '^e2e/.*\.spec\.ts$' | grep -v 'supabase-')
    [ -n "$CHANGED_SPECS" ] && SPECS="$SPECS $CHANGED_SPECS"

    if [ -z "$SPECS" ]; then
      # Non-trivial changes but no route match — run everything to be safe
      echo "Running full e2e suite (unrecognised file pattern)..." >&2
      if ! pnpm test:e2e >&2; then
        deny "E2e tests failed — see output above. Fix before committing."
      fi
    else
      # Deduplicate and run targeted specs
      SPECS=$(echo "$SPECS" | tr ' ' '\n' | sort -u | grep -v '^$' | tr '\n' ' ')
      echo "Running e2e: $SPECS" >&2
      # shellcheck disable=SC2086
      if ! pnpm test:e2e -- $SPECS >&2; then
        deny "E2e tests failed — see output above. Fix before committing."
      fi
    fi
  fi
fi

printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","permissionDecisionReason":"Typecheck, lint, formatting, and e2e passed."}}'
exit 0
