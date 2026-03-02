#!/bin/bash
#
# PostToolUse hook — runs after Write, Edit, NotebookEdit.
# Gives Claude immediate feedback on type errors, lint issues, and formatting.
#

block() {
  printf '{"hookSpecificOutput":{"hookEventName":"PostToolUse","decision":"block","reason":"%s"}}' "$1"
  exit 0
}

# 1. Typecheck (fast — uses tsgo / @typescript/native-preview)
if ! pnpm typecheck >&2; then
  block "Type errors after edit — fix before continuing."
fi

# 2. Lint
if ! pnpm lint >&2; then
  block "Lint errors after edit — fix before continuing."
fi

# 3. Format in place — pre-commit will catch any remaining staged diff
pnpm fmt >&2

exit 0
