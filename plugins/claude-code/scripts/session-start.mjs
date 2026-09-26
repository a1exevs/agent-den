// SessionStart hook: make sure the collector is up (unless the user paused the den with /agent-den:stop), then
// forward the event like every other hook.
// Never blocks or fails the session: errors swallowed, always exit 0, no stdout (it would land in the context).

import { ensureCollector, isPaused } from './den-server.mjs';
import { forward, readStdin } from './forward.mjs';

const raw = await readStdin();
try {
  if (!isPaused()) {
    await ensureCollector();
  }
} catch {
  // The den stays empty; the session goes on.
}
await forward(raw);
process.exit(0);
