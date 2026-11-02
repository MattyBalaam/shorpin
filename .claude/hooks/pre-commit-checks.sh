#!/bin/bash
#
# PreToolUse hook — intercepts `git commit` Bash commands.
#
# Formats the staged files, then runs the integration specs the staged files
# map to. Typecheck, lint and the format check are left to the git pre-commit
# hook (.githooks/pre-commit), which runs on every commit anyway, and the
# PostToolUse hook already checks types and lint after each edit.
#
# This runs *before* the Bash command, so it sees the index as it is now —
# which is why staging in the same command as the commit is refused below.

source "$(dirname "$0")/lib.sh"

COMMAND=$(echo "$HOOK_INPUT" | jq -r '.tool_input.command // empty')

# Only a `git commit` that starts the command or one of its segments, not the
# words appearing inside an argument (a PR body, an echo).
SEGMENT_START="(^|[;&|(]|"$'\n'")[[:space:]]*"
if [[ ! "$COMMAND" =~ ${SEGMENT_START}git[[:space:]]+commit([[:space:]]|$) ]]; then
  exit 0
fi

deny() {
  pre_tool_decision deny "$1"
}

# Commit flags, up to the first quote, so a message like "fix -a" isn't read
# as `-a`.
COMMIT_FLAGS=${COMMAND#*git commit}
COMMIT_FLAGS=${COMMIT_FLAGS%%[\"\';&|]*}

if [[ "$COMMAND" =~ ${SEGMENT_START}git[[:space:]]+(add|rm|mv|restore|reset|stash|apply|checkout|switch)([[:space:]]|$) ]] ||
  [[ " $COMMIT_FLAGS " =~ [[:space:]](--all|-[[:alpha:]]*a[[:alpha:]]*)[[:space:]] ]]; then
  deny "This hook checks the index before the command runs, so staging in the same command (git add/stash/reset… or commit -a) would skip the checks for what actually gets committed. Stage in one Bash call, then run git commit on its own."
fi

lines_to_array() {
  local name=$1 line
  eval "$name=()"
  while IFS= read -r line; do
    [ -n "$line" ] && eval "$name+=(\"\$line\")"
  done
}

STAGED_LIST=$(git diff --cached --name-only --diff-filter=ACMR)
[ -z "$STAGED_LIST" ] && exit 0
lines_to_array STAGED <<<"$STAGED_LIST"

# --- 1. Format staged files ------------------------------------------------
#
# Only files with no unstaged changes are formatted and re-staged: re-adding a
# partially staged file would sweep its unstaged edits into the commit. Those
# are only checked, and left to the agent to fix.
UNSTAGED_LIST=$(git diff --name-only)
lines_to_array FULLY_STAGED <<<"$(comm -23 <(sort <<<"$STAGED_LIST") <(sort <<<"$UNSTAGED_LIST"))"
lines_to_array PARTLY_STAGED <<<"$(comm -12 <(sort <<<"$STAGED_LIST") <(sort <<<"$UNSTAGED_LIST"))"

if [ ${#FULLY_STAGED[@]} -gt 0 ]; then
  pnpm exec oxfmt --no-error-on-unmatched-pattern "${FULLY_STAGED[@]}" >/dev/null 2>&1
  git add -- "${FULLY_STAGED[@]}"
fi

if [ ${#PARTLY_STAGED[@]} -gt 0 ] &&
  ! OUTPUT=$(pnpm exec oxfmt --check --no-error-on-unmatched-pattern "${PARTLY_STAGED[@]}" 2>&1); then
  deny "These staged files also have unstaged changes, so the hook won't format and re-stage them (that would commit the unstaged part too). Format them, re-stage what you intend to commit, and retry:
$(tail_output "$OUTPUT" 20)"
fi

# --- 2. Scoped integration tests ------------------------------------------
#
# Each staged file maps to the specs that cover it. Any file with no mapping
# runs the full suite, so a new kind of file is never silently untested.
SPECS=()
RUN_ALL=""
add_specs() {
  local spec
  for spec in "$@"; do SPECS+=("integration-tests/$spec"); done
}

for f in "${STAGED[@]}"; do
  case "$f" in
    *.css.ts | *.d.ts | *.md | *.toml | *.yaml | *.yml | .claude/* | .githooks/*) ;;
    app/routes/home/*) add_specs home.spec.ts offline.spec.ts ;;
    app/components/app-style/* | app/lib/app-style.ts) add_specs app-style.spec.ts home.spec.ts ;;
    app/components/color-scheme/* | app/lib/color-scheme.ts) add_specs color-scheme.spec.ts ;;
    app/routes/list/*) add_specs list.spec.ts delete.spec.ts config.spec.ts offline.spec.ts ;;
    app/routes/delete*) add_specs delete.spec.ts ;;
    app/routes/auth/*) add_specs auth.spec.ts ;;
    app/routes/sign-ups*) add_specs sign-ups.spec.ts ;;
    # Needs a real Supabase instance — its own runner, not this one.
    integration-tests/supabase-*) ;;
    integration-tests/*.spec.ts) SPECS+=("$f") ;;
    integration-tests/*.spec.ts-snapshots/*) SPECS+=("${f%%-snapshots/*}") ;;
    *) RUN_ALL=$f ;;
  esac
done

if [ -n "$RUN_ALL" ]; then
  SPECS=()
  SCOPE="full suite ($RUN_ALL has no spec mapping)"
elif [ ${#SPECS[@]} -eq 0 ]; then
  exit 0
else
  lines_to_array SPECS <<<"$(printf '%s\n' "${SPECS[@]}" | sort -u)"
  SCOPE="${SPECS[*]}"
fi

LOG_DIR="${TMPDIR:-/tmp}"; LOG_DIR="${LOG_DIR%/}/claude-pre-commit"
mkdir -p "$LOG_DIR"
RUN="$LOG_DIR/$(date +%Y%m%d-%H%M%S)"

echo "[pre-commit] Integration: $SCOPE (log: $RUN.log)" >&2

# One retry, so a single flake doesn't block the commit; the summary below
# still names anything that only passed on retry.
PLAYWRIGHT_JSON_OUTPUT_FILE="$RUN.json" PLAYWRIGHT_JSON_OUTPUT_NAME="$RUN.json" \
  pnpm test:integration --retries=1 --reporter=line,json "${SPECS[@]}" >"$RUN.log" 2>&1
STATUS=$?

tests_with_status() {
  [ -f "$RUN.json" ] || return
  jq -r --arg status "$1" '
    [.. | objects | select(has("specs")) | .specs[]
      | select(any(.tests[]; .status == $status))
      | "\(.file):\(.line) › \(.title)"]
    | unique | .[]' "$RUN.json" 2>/dev/null
}

if [ $STATUS -ne 0 ]; then
  FAILED=$(tests_with_status unexpected)
  deny "Integration tests failed ($SCOPE). Fix before committing.
${FAILED:-$(tail_output "$(cat "$RUN.log")")}
Full output: $RUN.log"
fi

FLAKY=$(tests_with_status flaky)
if [ -n "$FLAKY" ]; then
  pre_tool_decision allow "Integration tests passed ($SCOPE), but these only passed on retry:
$FLAKY
Full output: $RUN.log"
fi

pre_tool_decision allow "Integration tests passed ($SCOPE)."
