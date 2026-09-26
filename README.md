# agent-den

<p align="center">
  <img src="apps/web/public/logo-og.png" alt="agent-den" width="712" />
</p>

## Description

Watch your AI coding agents live in a pixel-art den. Every Claude Code or Cursor session is a character, its
subagents are its young, and every project folder is a room. Characters walk to the station of the tool they're using and show what
they are doing at a glance: thinking, working, waiting for you, done.

The den is skinnable. It ships with the **cats** skin: sessions are cats, subagents are kittens. Cats sniff books while
reading, scratch the post while editing, knock things off the table while running shell commands, stare out of the
window while browsing the web and yowl at the door when they need your permission. Kittens hop out of a box, done cats
nap on the cushion. More skins are on the way.

Workspaces:

| Package                  | Path                                           | Description                                                                       |
| ------------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| **@agent-den/web**       | [`apps/web/`](apps/web/)                       | Angular 22 web app: the den (zoneless, signals, Feature-Sliced Design)            |
| **@agent-den/collector** | [`apps/collector/`](apps/collector/)           | Node + Hono service on `127.0.0.1:4317`: hooks in, agent state out over WebSocket |
| **@agent-den/contracts** | [`packages/contracts/`](packages/contracts/)   | Events, agent state and the reducer shared by collector and web                   |
| **@agent-den/mock**      | [`tools/mock/`](tools/mock/)                   | Dev-only generator of fake sessions                                               |
| Claude Code plugin       | [`plugins/claude-code/`](plugins/claude-code/) | Hooks that forward session, tool and subagent events to the collector             |
| Cursor plugin            | [`plugins/cursor/`](plugins/cursor/)           | The same for Cursor                                                               |
| Launcher                 | [`plugins/launcher/`](plugins/launcher/)       | Starts, upgrades and stops the collector; packed into both plugins                |

How it fits together:

```
Claude Code ──hooks──▶ plugins/claude-code ──HTTP──┐
Cursor ───────hooks──▶ plugins/cursor ─────HTTP────┴─▶ collector ──WebSocket──▶ den in the browser
                                                          ▲
      ~/.claude/projects/*.jsonl, ~/.cursor/projects/*/agent-transcripts (transcripts: backfill + reconciliation)
```

Both plugins report to one collector: whichever agent starts first runs it, the other one just sends its events.

## Use it (no repository needed)

Needs `node` 22+ on `PATH`, and [Claude Code](https://claude.com/claude-code) or [Cursor](https://cursor.com) (or
both).

### Claude Code

In Claude Code:

```
/plugin marketplace add a1exevs/agent-den
/plugin install agent-den@agent-den
```

`a1exevs/agent-den` is cloned over SSH; without a GitHub SSH key add `https://github.com/a1exevs/agent-den.git`
instead.

Start a new session: the plugin starts the den in the background by itself. Sessions that were already running show
up from their transcripts.

| Command            | What it does                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `/agent-den:start` | Start the den if it isn't running and open it in the browser (http://localhost:4317)               |
| `/agent-den:stop`  | Stop the den and keep it off: new sessions won't start it until `/agent-den:start`. Cats are saved |

To remove the plugin for good, run `/agent-den:stop` first, then uninstall it in `/plugin` — otherwise the den keeps
running in the background until the next reboot.

To get new versions automatically, turn on auto-update for the `agent-den` marketplace in `/plugin` → Marketplaces
(it is off by default for third-party marketplaces). Or update by hand: `/plugin marketplace update agent-den`.

### Cursor

Open **Customize** in the sidebar → add a plugin **From GitHub Repository** →
`https://github.com/a1exevs/agent-den` → install `agent-den`. The repository's `.cursor-plugin/marketplace.json`
points Cursor at `plugins/cursor`.

Start a new chat: the plugin starts the den in the background by itself (`sessionStart`). Chats that were already
running show up from their transcripts.

| Command            | What it does                                                                                       |
| ------------------ | -------------------------------------------------------------------------------------------------- |
| `/agent-den-start` | Start the den if it isn't running and open it in the browser (http://localhost:4317)               |
| `/agent-den-stop`  | Stop the den and keep it off: new sessions won't start it until `/agent-den-start`. Cats are saved |

The agent runs these commands for you in a shell outside the sandbox (the den binds a local port and writes to
`~/.agent-den`), so Cursor may ask you to approve that command.

The hooks never block the agent. Cursor's `preToolUse` and `subagentStart` hooks must answer before a tool or a
subagent runs; the plugin answers `{}` (no opinion), so your own approval settings apply as before. If the den or
`node` is missing, the hook fails and Cursor lets the action through.

To try a local checkout instead, copy `plugins/cursor` to `~/.cursor/plugins/local/agent-den` (a copy: Cursor skips
symlinks that point outside that folder) and reload the window.

### Where the den keeps its data

The collector listens on `127.0.0.1` only. It keeps the den in `~/.agent-den/den-state.json` (so updates and reboots
don't empty it) and writes `~/.agent-den/collector.log`; `AGENT_DEN_HOME` moves the folder. Both plugins share it,
and so the pause: `/agent-den:stop` in Claude Code keeps the den off for Cursor too. Versions up to 0.2.x kept it in
the Claude Code plugin data folder; the first start of 0.3 moves it over.

## Develop

Prerequisites: Node **22.22.3** or newer (`^22.22.3 || ^24.15.0 || >=26`), npm **10.9.8**.

From the **repository root**:

```bash
npm install
```

```bash
npm run dev:collector
```

```bash
npm run dev:web
```

Open http://localhost:4210 (the dev server proxies `/ws` to the collector). No Claude Code at hand? Run
`npm run dev:mock` for a den full of fake agents. With the dev collector running, the installed plugin's launcher
leaves it alone (it reports version `dev`).

## Available scripts

Run from the **repository root**.

### Development

| Command                 | Description                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| `npm run dev:collector` | Collector on `127.0.0.1:4317` with watch                                                               |
| `npm run dev:web`       | Angular dev server on http://localhost:4210                                                            |
| `npm run dev:web:fresh` | Same, after clearing `.angular/cache` (needed after changing `packages/contracts` or `tsconfig` paths) |
| `npm run dev:mock`      | Streams fake sessions, tools and subagents into the collector                                          |

### Quality

| Command                                   | Description                                                                                    |
| ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `npm run lint`                            | Everything below plus ESLint (FSD imports, cycles, segment direction), Steiger (FSD) and `tsc` |
| `npm run lint:structure`                  | FSD folders and `index.ts` placement, kebab-case names                                         |
| `npm run lint:unused`                     | knip: unused files, exports and dependencies                                                   |
| `npm run format` / `npm run format:check` | Prettier                                                                                       |
| `npm test`                                | Vitest in every workspace                                                                      |
| `npm run build`                           | Build every workspace                                                                          |
| `npm run build:plugin`                    | Pack the collector, the den and the launcher into both plugins' `den/` (committed)             |

### Tooling

| Command                  | Description                                                                                        |
| ------------------------ | -------------------------------------------------------------------------------------------------- |
| `npm run generate:icons` | Regenerate favicons, app icons and the OG image in `apps/web/public` from the code-defined sprites |
| `npm run rules:sync`     | Regenerate `.claude/rules` from `.cursor/rules` (the single source of coding rules)                |

## Releasing the plugin

Both plugins share one version (and one collector), so they are released together.

1. Bump `version` in `plugins/claude-code/.claude-plugin/plugin.json` — users only get an update when it changes.
2. `npm run build:plugin` — copies the version into `plugins/cursor/.cursor-plugin/plugin.json` and packs the
   collector, the den and the launcher into `plugins/claude-code/den` and `plugins/cursor/den`. Commit the result:
   marketplaces install the plugin folder exactly as it is in git. The build refuses changed sources under an
   already built version, and `npm run lint` fails when the manifests and the builds disagree.
3. Push to `main`.
4. Claude Code users with auto-update get it on the next start; others run `/plugin marketplace update agent-den`.
   Cursor picks up the new version when it refreshes the plugin from GitHub (Customize → the plugin → update). The
   first new session in either agent replaces a collector left over from the previous version; sessions still on an
   older version never downgrade it.

## Features

- Live sessions from Claude Code and Cursor hooks, plus transcript backfill for sessions started before the plugin
- Subagents live next to their parent, always in its room
- A station per tool category: read, edit, shell, web, subagents, rest, the door in and out
- Precise statuses: thinking, using a tool, waiting for you, done, interrupted (Esc), error; dusty characters for stale
  sessions
- Details panel with the live transcript of any session or subagent
- Collapsible rooms and a roster toolbar to find an agent quickly
- A sound when an agent needs you and when a session is done, a different voice per character (cats: meow and purr)
- Browser notifications while the tab is in the background; click one to open that agent
- Send agents home: hide finished sessions with undo, nothing is ever lost
- Skins: every look (sprites, stations, sounds, names) is one pluggable skin; cats come first
- Private by design: the collector listens on loopback only and rejects non-local origins

## Coding rules

Coding rules for agents live in [`.cursor/rules`](.cursor/rules) and are generated into `.claude/rules`;
[`AGENTS.md`](AGENTS.md) is the project guide for every coding agent.

## Credits

- Cat sounds: [BigSoundBank](https://bigsoundbank.com/) by Joseph Sardin, CC0 — see
  [`apps/web/public/sounds/README.md`](apps/web/public/sounds/README.md)
- UI primitives: [Spartan](https://www.spartan.ng/) brain

## Repository

- Repository: https://github.com/a1exevs/agent-den

## License

[MIT](LICENSE)
