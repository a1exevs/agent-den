---
name: agent-den-stop
description: Stop agent-den and keep it off — new sessions won't start it until /agent-den-start. Use only when the user runs /agent-den-stop.
disable-model-invocation: true
---

# Stop agent-den

1. Run `node "<plugin root>/scripts/stop.mjs"`, where `<plugin root>` is the folder two levels above this
   `SKILL.md` (it holds `.cursor-plugin/`). Run it outside the sandbox (all permissions): it stops the background
   collector on `127.0.0.1:4317` and writes to `~/.agent-den`.
2. Relay the line it prints to the user in one short sentence.

Do nothing else.
