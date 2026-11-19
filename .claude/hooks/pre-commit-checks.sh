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
# The shared suite (packages/specs) runs once per app (deploy/apps.json).
# Each staged file maps to the apps and specs that cover it, as
# "<app> <spec>" lines: app "*" is every app, spec "*" the full suite. Any
# file with no mapping runs the full suite for every app, so a new kind of
# file is never silently untested.
APPS=$(jq -r 'keys[]' deploy/apps.json)
TARGETS=()
RUN_ALL_REASON=""
add_specs() {
  local app=$1 spec
  shift
  for spec in "$@"; do TARGETS+=("$app integration-tests/$spec"); done
}

SPEC_DIR=packages/specs/integration-tests
for f in "${STAGED[@]}"; do
  case "$f" in
    *.css.ts | *.d.ts | *.md | *.toml | *.yaml | *.yml | .claude/* | .githooks/* | deploy/*) ;;
    apps/react-router/app/routes/home/*) add_specs react-router home.spec.ts offline.spec.ts ;;
    apps/react-router/app/components/app-style/* | apps/react-router/app/lib/app-style.ts) add_specs react-router app-style.spec.ts home.spec.ts ;;
    apps/react-router/app/components/color-scheme/* | apps/react-router/app/lib/color-scheme.ts) add_specs react-router color-scheme.spec.ts ;;
    apps/react-router/app/components/notifications/* | apps/react-router/app/lib/toast.ts) add_specs react-router notifications.spec.ts auth.spec.ts list.spec.ts ;;
    apps/react-router/app/routes/list/*) add_specs react-router list.spec.ts delete.spec.ts config.spec.ts offline.spec.ts bin.spec.ts ;;
    apps/react-router/app/routes/delete*) add_specs react-router delete.spec.ts ;;
    apps/react-router/app/routes/auth/*) add_specs react-router auth.spec.ts ;;
    apps/react-router/app/routes/sign-ups*) add_specs react-router sign-ups.spec.ts ;;
    # Unit tests run in CI, not here.
    apps/*.test.ts | apps/*.test.tsx) ;;
    # Anything else in an app: that app's full suite.
    apps/*/*) app=${f#apps/}; TARGETS+=("${app%%/*} *") ;;
    # Needs a real Supabase instance: its own runner, not this one.
    packages/specs/e2e/* | packages/specs/playwright.supabase.config.ts) ;;
    # An app's adapter: that app's full suite. The shared adapter files: all.
    packages/specs/apps/*.ts)
      app=$(basename "$f" .ts)
      case "$app" in index | types) TARGETS+=("* *") ;; *) TARGETS+=("$app *") ;; esac ;;
    # A shared spec runs for every app; a snapshot only for its own app.
    "$SPEC_DIR"/*.spec.ts) TARGETS+=("* ${f#packages/specs/}") ;;
    "$SPEC_DIR"/*.spec.ts-snapshots/*/*)
      spec=${f#packages/specs/}
      spec=${spec%%-snapshots/*}
      app=${f#*.spec.ts-snapshots/}
      TARGETS+=("${app%%/*} $spec") ;;
    *) TARGETS+=("* *"); RUN_ALL_REASON=$f ;;
  esac
done

[ ${#TARGETS[@]} -eq 0 ] && exit 0

LOG_DIR="${TMPDIR:-/tmp}"; LOG_DIR="${LOG_DIR%/}/claude-pre-commit"
mkdir -p "$LOG_DIR"
STAMP=$(date +%Y%m%d-%H%M%S)

tests_with_status() {
  [ -f "$2" ] || return
  jq -r --arg status "$1" '
    [.. | objects | select(has("specs")) | .specs[]
      | select(any(.tests[]; .status == $status))
      | "\(.file):\(.line) › \(.title)"]
    | unique | .[]' "$2" 2>/dev/null
}

SUMMARY=()
FLAKY_ALL=""
for APP in $APPS; do
  # This app's specs: its own targets and the every-app ones.
  APP_SPECS=$(printf '%s\n' "${TARGETS[@]}" | awk -v app="$APP" '$1 == app || $1 == "*" { print $2 }' | sort -u)
  [ -z "$APP_SPECS" ] && continue
  if grep -qxF '*' <<<"$APP_SPECS"; then
    SPECS=()
    SCOPE="$APP: full suite${RUN_ALL_REASON:+ ($RUN_ALL_REASON has no spec mapping)}"
  else
    lines_to_array SPECS <<<"$APP_SPECS"
    SCOPE="$APP: ${SPECS[*]}"
  fi

  RUN="$LOG_DIR/$STAMP-$APP"
  echo "[pre-commit] Integration: $SCOPE (log: $RUN.log)" >&2

  # One retry, so a single flake doesn't block the commit; the summary below
  # still names anything that only passed on retry.
  APP=$APP PLAYWRIGHT_JSON_OUTPUT_FILE="$RUN.json" PLAYWRIGHT_JSON_OUTPUT_NAME="$RUN.json" \
    pnpm test:integration --retries=1 --reporter=line,json "${SPECS[@]}" >"$RUN.log" 2>&1
  STATUS=$?

  if [ $STATUS -ne 0 ]; then
    FAILED=$(tests_with_status unexpected "$RUN.json")
    deny "Integration tests failed ($SCOPE). Fix before committing.
${FAILED:-$(tail_output "$(cat "$RUN.log")")}
Full output: $RUN.log"
  fi

  FLAKY=$(tests_with_status flaky "$RUN.json")
  if [ -n "$FLAKY" ]; then
    FLAKY_ALL+="$APP:
$FLAKY
Full output: $RUN.log
"
  fi
  SUMMARY+=("$SCOPE")
done

[ ${#SUMMARY[@]} -eq 0 ] && exit 0
SCOPE=$(printf '%s; ' "${SUMMARY[@]}")
SCOPE=${SCOPE%; }

if [ -n "$FLAKY_ALL" ]; then
  pre_tool_decision allow "Integration tests passed ($SCOPE), but these only passed on retry:
$FLAKY_ALL"
fi

pre_tool_decision allow "Integration tests passed ($SCOPE)."
