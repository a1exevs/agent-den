// Reads a Claude Code hook payload from stdin and forwards it to the agent-den collector.
// Must never block or fail the agent: short timeout, errors swallowed, always exit 0, no stdout.

import { forward, parsePayload, readStdin } from '../den/launcher/forward.mjs';
import { isCursorPayload } from './plugin.mjs';

const payload = parsePayload(await readStdin());
if (payload && !isCursorPayload(payload)) {
  // `cwd` follows the agent's `cd`s; the project root is what maps to a room.
  await forward(payload, 'claude-code', { project_dir: process.env.CLAUDE_PROJECT_DIR });
}
process.exit(0);
