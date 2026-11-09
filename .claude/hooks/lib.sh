#!/bin/bash
#
# Shared setup for the Claude Code hooks in this directory. Source it, don't
# run it.

# Hooks run in a bare subprocess that may not have node/pnpm on PATH (version
# managers like fnm/nvm only activate in a login shell). Prefer fnm's own env
# (respects any project-pinned version); fall back to fnm's stable "default"
# alias dir if the fnm command itself isn't reachable either.
if command -v fnm >/dev/null 2>&1; then
  eval "$(fnm env)"
elif ! command -v pnpm >/dev/null 2>&1 && [ -d "$HOME/.local/share/fnm/aliases/default/bin" ]; then
  export PATH="$HOME/.local/share/fnm/aliases/default/bin:$PATH"
fi

cd "${CLAUDE_PROJECT_DIR:-.}" || exit 0

HOOK_INPUT=$(cat)

# Hook decisions are JSON on stdout with exit 0. Only that JSON reaches the
# agent (stderr doesn't, unless the hook exits 2), so the reason has to carry
# whatever the agent needs to act on. Built with jq so quotes and newlines in
# tool output can't break the JSON.

# PreToolUse: allow/deny the tool call.
pre_tool_decision() {
  jq -n --arg decision "$1" --arg reason "$2" \
    '{hookSpecificOutput: {hookEventName: "PreToolUse", permissionDecision: $decision, permissionDecisionReason: $reason}}'
  exit 0
}

# PostToolUse: the tool already ran, so "block" just feeds the reason back.
post_tool_block() {
  jq -n --arg reason "$1" '{decision: "block", reason: $reason}'
  exit 0
}

# Last lines of a command's output, for a decision reason.
tail_output() {
  printf '%s' "$1" | tail -n "${2:-40}"
}
