@AGENTS.md

## Claude Code specifics

- Coding rules reach you as path-scoped `.claude/rules/*.md`, generated from `.cursor/rules/*.mdc`. To change a
  rule, edit the `.mdc` and run `npm run rules:sync`.
- Project-wide instructions for all agents live in `AGENTS.md` (imported above); put only Claude-specific notes here.
- Preview: `.claude/launch.json` has the `web` config (Angular dev server, port 4210) for `preview_start`.
