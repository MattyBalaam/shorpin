#!/bin/bash
#
# PreToolUse hook — intercepts git commit commands.
# Runs typecheck and formatter before allowing a commit to proceed.
#
# Blocks the commit if:
#   - pnpm typecheck reports type errors
#   - pnpx oxfmt reformatted files (agent must re-stage before retrying)

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

# 2. Format — modifies files in place
pnpx oxfmt >&2

# 3. If formatter changed tracked files, block so agent can re-stage them
if ! git diff --quiet; then
  deny "Formatter changed files. Stage the changes with \`git add\` and retry the commit."
fi

printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow","permissionDecisionReason":"Typecheck and formatting passed."}}'
exit 0
