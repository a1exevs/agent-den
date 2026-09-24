# agent-den

Pixel-art den where AI agent sessions are cats and subagents are kittens. Requirements: `docs/requirements.md`.

## Layout (npm workspaces)

- `apps/web` — Angular 22, zoneless, signals, FSD. UI primitives: `@spartan-ng/brain` wrapped in `src/shared/ui`, plain CSS.
- `apps/collector` — Node + Hono on `127.0.0.1:4317`: `POST /hooks/claude-code`, `POST /hooks/cursor`, `POST /events`, WebSocket `/ws`.
- `packages/contracts` — `DenEvent`, `AgentState`, `reduceAgents()` shared by collector and web.
- `plugins/claude-code` — Claude Code plugin (hooks → `scripts/send.mjs` → collector). Marketplace: `.claude-plugin/marketplace.json`.
- `tools/mock` — dev-only scenario generator.

## Commands

- `npm run dev:collector` / `npm run dev:web` / `npm run dev:mock`
- `npm run lint`, `npm test`, `npm run build`, `npm run format`

## Rules

Follow `.cursor/rules/*.mdc` — they apply to Claude Code too:
`fsd-architecture`, `component-architecture`, `state-management`, `styling-guidelines`, `typescript-guidelines`, `file-naming`.

Key constraints:

- `@spartan-ng/*` only inside `apps/web/src/shared/**` (ESLint enforced).
- No relative imports in `apps/web/src`; cross-layer via `@shared`, `@entities`, ...; intra-layer via `src/...`.
- Components: separate `.ts` / `.html` / `.css` files, never inline templates or styles.
- Dependency versions are pinned exactly (`.npmrc` `save-exact=true`).
- Hook sender must never block or fail the agent: short timeout, swallow errors, exit 0, no stdout.

## Plugin development

The installed plugin is a cached copy (`~/.claude/plugins/cache/agent-den/agent-den/<version>`). After changing
`plugins/claude-code`, bump `version` in `.claude-plugin/plugin.json`, then run
`claude plugin marketplace update agent-den` and `claude plugin update agent-den@agent-den`; new sessions pick it up.
Raw payloads the collector received: `GET http://127.0.0.1:4317/debug/hooks`.
