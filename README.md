# agent-den 🐾

A living pixel-art den where your AI agents are cats. Every Claude Code / Cursor session is a cat, every subagent
is a kitten. They walk to the station of the tool they're using: sniff books while reading, scratch the post while
editing, knock things off the table while running shell commands and yowl at the door when they need your permission.

## Quick start

```bash
npm install
npm run dev:collector   # 127.0.0.1:4317
npm run dev:web         # http://localhost:4210
npm run dev:mock        # optional: fake agents for development
```

### Connect Claude Code

```
/plugin marketplace add D:/projects/agent-den
/plugin install agent-den@agent-den
```

The plugin forwards hook events to the local collector. If the collector isn't running, hooks silently do nothing.

## Structure

See [CLAUDE.md](CLAUDE.md) and [docs/requirements.md](docs/requirements.md).
