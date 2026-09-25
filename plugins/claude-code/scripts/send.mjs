// Reads a Claude Code hook payload from stdin and forwards it to the agent-den collector.
// Must never block or fail the agent: short timeout, errors swallowed, always exit 0, no stdout.

import { forward, readStdin } from './forward.mjs';

await forward(await readStdin());
process.exit(0);
