#!/bin/bash
#
# PostToolUse hook — runs after Write, Edit, NotebookEdit.
# Gives Claude immediate feedback on type errors, lint issues, and formatting.
#

# Non-interactive bash doesn't source ~/.zshrc, where fnm's shell integration
# lives, so pnpm/node are invisible here even though they resolve in a normal
# terminal. Fall back to fnm's stable "default" alias dir if not already on PATH.
if ! command -v pnpm >/dev/null 2>&1 && [ -d "$HOME/.local/share/fnm/aliases/default/bin" ]; then
  export PATH="$HOME/.local/share/fnm/aliases/default/bin:$PATH"
fi

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
