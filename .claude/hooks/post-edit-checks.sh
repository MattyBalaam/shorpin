#!/bin/bash
#
# PostToolUse hook — runs after Write, Edit, NotebookEdit.
# Gives Claude immediate feedback on type errors and lint issues, and formats
# the edited file.
#
# Scoped to the file that was edited: formatting the whole repo rewrites files
# Claude has open, which then fail its next edit as "modified since read".

source "$(dirname "$0")/lib.sh"

FILE=$(echo "$HOOK_INPUT" | jq -r '.tool_input.file_path // .tool_input.notebook_path // empty')

# Edits outside the project (scratchpad, other repos) aren't ours to check.
case "$FILE" in
  "$PWD"/*) ;;
  *) exit 0 ;;
esac
[ -f "$FILE" ] || exit 0

if [[ "$FILE" =~ \.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$ ]]; then
  # Typecheck is project-wide: an edit can break another file's types.
  if ! OUTPUT=$(pnpm --silent typecheck 2>&1); then
    post_tool_block "Type errors after edit — fix before continuing:
$(tail_output "$OUTPUT")"
  fi

  if ! OUTPUT=$(pnpm --silent lint "$FILE" 2>&1); then
    post_tool_block "Lint errors in $FILE — fix before continuing:
$(tail_output "$OUTPUT")"
  fi
fi

pnpm exec oxfmt --no-error-on-unmatched-pattern "$FILE" >/dev/null 2>&1

exit 0
