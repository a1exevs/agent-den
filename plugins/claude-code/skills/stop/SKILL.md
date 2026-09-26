---
description: Stop agent-den and keep it off — new sessions won't start it until /agent-den:start.
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/stop.mjs"`

Relay the line above to the user in one short sentence. Do nothing else.
