// SessionStart hook: make sure the collector is up (unless the user paused the den with /agent-den:stop), then
// forward the event like every other hook.
// Never blocks or fails the session: errors swallowed, always exit 0, no stdout (it would land in the context).

import { forward, parsePayload, readStdin } from '../den/launcher/forward.mjs';
import { den, isCursorPayload } from './plugin.mjs';

const payload = parsePayload(await readStdin());
if (payload && !isCursorPayload(payload)) {
  try {
    if (!den.isPaused()) {
      await den.ensureCollector();
    }
  } catch {
    // The den stays empty; the session goes on.
  }
  await forward(payload, 'claude-code', { project_dir: process.env.CLAUDE_PROJECT_DIR });
}
process.exit(0);
