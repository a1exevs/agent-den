# agent-den

Pixel-art den for AI agent sessions and their subagents, with switchable skins (ships with cats: sessions are cats,
subagents are kittens). Requirements: `docs/requirements.md`.

This file is read by every coding agent (Cursor natively, Claude Code through `CLAUDE.md`). Keep it tool-agnostic.

## Layout (npm workspaces)

- `apps/web` — Angular 22, zoneless, signals, FSD. UI primitives: `@spartan-ng/brain` wrapped in `src/shared/ui`, plain
  CSS. Dev server on port 4210.
- `apps/collector` — Node + Hono on `127.0.0.1:4317`: `POST /hooks/claude-code`, `POST /hooks/cursor`, `POST /events`,
  WebSocket `/ws` (agent snapshot/events + transcript streaming). Backfills sessions from `~/.claude/projects` and
  reconciles agents silent in hooks with their transcripts (Esc interruptions, killed subagents, sessions without the
  plugin).
- `packages/contracts` — `DenEvent`, `AgentState`, `TranscriptItem`, `reduceAgents()` shared by collector and web.
- `plugins/claude-code` — Claude Code plugin (hooks → `scripts/send.mjs` → collector). Marketplace:
  `.claude-plugin/marketplace.json`.
- `tools/mock` — dev-only scenario generator.

## Commands

- `npm run dev:collector` / `npm run dev:web` / `npm run dev:mock`
- `npm run lint` — rules sync check, structure check (FSD folders, kebab-case), Prettier, knip (unused exports),
  ESLint for Node packages (root `eslint.config.mjs`),
  ESLint (incl. FSD imports, cycles, segment direction), Steiger (FSD), tsc
- `npm test`, `npm run build`, `npm run format`
- `npm run rules:sync` — regenerate `.claude/rules` after editing `.cursor/rules`

## Coding rules

One source: `.cursor/rules/*.mdc`, each scoped to files by `globs`:
`fsd-architecture`, `component-architecture`, `state-management`, `styling-guidelines`, `typescript-guidelines`,
`file-naming`. `.claude/rules/*.md` are generated from them (`npm run rules:sync`) — never edit those by hand;
`npm run lint` fails when they drift.

Key constraints:

- FSD (standard): import other slices via `@layer/slice` (`@entities/agent`), shared via `@shared/<segment>`
  (`@shared/ui`), relative paths inside a slice (no `src/...`); no layer `index.ts`.
- `@spartan-ng/*` only inside `apps/web/src/shared/**`.
- Components: separate `.ts` / `.html` / `.css` files, never inline templates or styles.
- Dependency versions are pinned exactly (`.npmrc` `save-exact=true`).
- The hook sender must never block or fail the agent: short timeout, swallow errors, exit 0, no stdout.
- The collector binds to loopback and rejects non-local `Origin`s (HTTP and WebSocket) — hook payloads and transcripts
  contain prompts and file paths.

## Plugin development

The installed Claude Code plugin is a cached copy (`~/.claude/plugins/cache/agent-den/agent-den/<version>`). After
changing `plugins/claude-code`, bump `version` in `.claude-plugin/plugin.json`, then run
`claude plugin marketplace update agent-den` and `claude plugin update agent-den@agent-den`; new sessions pick it up.
Raw payloads the collector received: `GET http://127.0.0.1:4317/debug/hooks`.

## Gotchas

- `ng serve` doesn't pick up changes to `tsconfig` `paths` or to `packages/contracts` (outside the app root —
  Angular's watcher, even with `NG_BUILD_WATCH_ROOT`, only watches the app). After such a change stop the dev server
  and run `npm run dev:web:fresh` (clears `.angular/cache`). `ng build` is not affected.
- Port 4200 is often taken on this machine by another project — the web app uses 4210.
