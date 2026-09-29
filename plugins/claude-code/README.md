# agent-den

Watch your Claude Code sessions live in a pixel-art den. Every session is a cat, its subagents are kittens, and every
project folder is a room. Cats walk to the station of the tool they are using (books for reading, the scratching post
for editing, the table for shell commands, the window for the web), yowl at the door when they need your permission,
purr when a turn is done and nap on the cushion afterwards.

Source, issues and the full README: https://github.com/a1exevs/agent-den

## Install

```
/plugin marketplace add a1exevs/agent-den
/plugin install agent-den@agent-den
```

Needs Node.js 22 or newer on `PATH`. Start a new session, then run `/agent-den:start`: the den opens at
http://localhost:4317.

## Commands

- `/agent-den:start` starts the den if it isn't running and opens it in your browser.
- `/agent-den:stop` saves the den, stops it and keeps it off until the next `/agent-den:start`.

## What the plugin runs

- **Hooks.** Every Claude Code hook event (`SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PreToolUse`,
  `PostToolUse`, `PostToolUseFailure`, `PermissionRequest`, `SubagentStart`, `SubagentStop`, `Notification`, `Stop`)
  runs `node scripts/send.mjs`, which posts the hook payload to `http://127.0.0.1:4317/hooks/claude-code` with a
  one-second timeout. If nothing listens there, the payload is dropped. A hook never blocks or fails the session.
- **A local server.** `SessionStart` runs `scripts/session-start.mjs`, which starts `den/collector.mjs` as a detached
  background process when no collector answers on port 4317 (or an older plugin version's collector does). The
  collector is a Node.js server bound to `127.0.0.1` only. It keeps the state of your agents, serves the den web app
  from `den/web` on the same port and streams updates to the page over a WebSocket. It rejects requests whose
  `Origin` or `Host` header is not local, so other websites can't read it.
- **Skills.** `/agent-den:start` and `/agent-den:stop` run `scripts/start.mjs` and `scripts/stop.mjs` (through the
  skill's `!` command line). `start.mjs` opens the den URL in your default browser.

## What it reads

- **Hook payloads:** session and agent ids, the working directory, the prompt text, tool names and inputs, the
  transcript path. They are kept in memory to draw the den and to show the details panel.
- **Transcripts** under `~/.claude/projects`: the collector reads the transcript files of your Claude Code sessions to
  pick up sessions that were already running before the plugin was installed, to notice interruptions and finished
  subagents that hooks don't report, and to show a session's transcript in the details panel when you open it.

## What it stores

In the plugin data folder Claude Code provides (`CLAUDE_PLUGIN_DATA`): `den-state.json` (the agents, so an update or a
reboot keeps them), `collector.log` and a `paused` flag written by `/agent-den:stop`. The den page keeps its sound and
notification settings in the browser's local storage.

## What it sends

Nothing leaves your machine. There is no telemetry, no analytics and no network access other than the local
loopback connection between the hooks, the collector and your browser.

## Built files

`den/` is build output, committed so that the plugin is self-contained: `den/collector.mjs` and `den/lib/*` are the
collector's sources (`apps/collector`) bundled with esbuild without minification; `den/web` is the production build of
the Angular app in `apps/web`. Regenerate them with `npm run build:plugin` in the repository.

## License

MIT — see `LICENSE`. Cat sounds by Joseph Sardin (BigSoundBank), CC0.
