# agent-den — requirements (MVP)

A living pixel-art world where AI agents are characters. Each agent session is a cat, each subagent is a kitten.
The character walks to the **station** that matches the tool it is currently using. Skins are swappable; the MVP
ships only the **cats** skin, but the skin engine is built from day one (builders, kitchen, ant farm, mission
control — later).

## Data sources

| Source                                    | How                                                                                                                        | Why                                       |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- |
| Claude Code (CLI + desktop Code tab)      | plugin with hooks: `SessionStart/End`, `UserPromptSubmit`, `Pre/PostToolUse`, `SubagentStart/Stop`, `Notification`, `Stop` | live status                               |
| Cursor                                    | Cursor hooks → adapter to the common event contract                                                                        | live status                               |
| JSONL transcripts `~/.claude/projects/**` | collector tails files                                                                                                      | pick up already running sessions, history |

## Repository layout (npm workspaces)

- `apps/web` — Angular (latest), standalone, signals, zoneless, FSD. Spartan `brain` + plain CSS (no Tailwind, no LESS).
- `apps/collector` — Node + Hono: accepts hook POSTs, tails JSONL, broadcasts over WebSocket on `localhost`.
- `packages/contracts` — shared event / agent state types.
- `plugins/claude-code`, `plugins/cursor` — hook configs + sender script.
- `tools/mock` — dev-only scenario generator.

## Stations (cats skin)

| Tool category          | Cat does                      |
| ---------------------- | ----------------------------- |
| Read / Grep / Glob     | sniffs a book                 |
| Edit / Write           | scratches the scratching post |
| Bash                   | knocks things off the table   |
| WebFetch / WebSearch   | stares out of the window      |
| Task (subagent)        | a kitten jumps out of a box   |
| Waiting for permission | yowls at the door             |
| Stop                   | sleeps on the keyboard        |
| Tool error             | hisses, fur up                |

## MVP features

1. World: rooms per project (`cwd`), cats per session, kittens per subagent, state animations.
2. Details panel on click: project, current tool, event feed, duration.
3. Sound ("meow") + browser notification when an agent waits for permission / finishes. Toggleable.
4. Stats & achievements: tool counters, work time, achievements (e.g. "Cat mafia — 5 cats at once").
5. Dev-only mock event generator.

## Code rules

- FSD rules adapted from set-forge (`.cursor/rules`), rewritten for Angular.
- Prettier: `@alexevs/prettier-config`.
- ESLint: `angular-eslint` + set-forge rules (import order, absolute paths, curly, unused vars, no-console).
- **All UI primitives live in `src/shared/ui`.** `@spartan-ng/*` imports are forbidden outside `src/shared/**`
  (enforced by ESLint).
- Sprites are drawn in code (pixel matrices), no third-party assets.
