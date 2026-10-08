#!/usr/bin/env bash
# PreToolUse hook: blocks any tool call that references constants.js (sensitive data).
# Exit code 2 blocks the call and sends stderr back to the agent.

payload=$(cat)

# Concatenate every string value in tool_input (file_path, path, glob, pattern, command...)
inputs=$(printf '%s' "$payload" | jq -r '[.tool_input | .. | strings] | join("\n")' 2>/dev/null)

if printf '%s' "$inputs" | grep -Eq '(^|[^[:alnum:]_.-])constants\.js([^[:alnum:]_.-]|$)'; then
  echo "No puedo leer ese archivo" >&2
  exit 2
fi

exit 0
