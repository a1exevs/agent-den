---
name: agent-den-start
description: Start agent-den (the live pixel-art den of your Cursor agents) and open it in the browser. Use only when the user runs /agent-den-start.
disable-model-invocation: true
---

# Start agent-den

1. Run `node "<plugin root>/scripts/start.mjs"`, where `<plugin root>` is the folder two levels above this
   `SKILL.md` (it holds `.cursor-plugin/`). Run it outside the sandbox (all permissions): it starts a background
   collector on `127.0.0.1:4317` and writes to `~/.agent-den`.
2. Relay the line it prints to the user in one short sentence (the den's address, or the error with the log path).

Do nothing else.
