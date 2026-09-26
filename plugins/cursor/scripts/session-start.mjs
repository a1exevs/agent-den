// sessionStart hook: make sure the collector is up (unless the user paused the den with /agent-den-stop), then
// forward the event like every other hook.
// Never blocks or fails the session: errors swallowed, always exit 0, no stdout (it would land in the context).

import { forward, parsePayload, readStdin } from '../den/launcher/forward.mjs';
import { den } from './plugin.mjs';

const payload = parsePayload(await readStdin());
try {
  if (!den.isPaused()) {
    await den.ensureCollector();
  }
} catch {
  // The den stays empty; the session goes on.
}
if (payload) {
  await forward(payload, 'cursor');
}
process.exit(0);
