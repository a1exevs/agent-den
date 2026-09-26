---
description: Start agent-den (the live pixel-art den of your Claude Code sessions) and open it in the browser.
disable-model-invocation: true
allowed-tools: Bash(node:*)
---

!`node "${CLAUDE_PLUGIN_ROOT}/scripts/start.mjs"`

Relay the line above to the user in one short sentence (the den's address, or the error with the log path).
Do nothing else.
