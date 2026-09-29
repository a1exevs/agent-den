@AGENTS.md

## Claude Code specifics

- Coding rules are the path-scoped `.claude/rules/*.md` (frontmatter `paths` says which files each one covers). Edit
  them directly.
- Project-wide instructions for all agents live in `AGENTS.md` (imported above); put only Claude-specific notes here.
- Preview: `.claude/launch.json` has the `web` config (Angular dev server, port 4210) for `preview_start`.
