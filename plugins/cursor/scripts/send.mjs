// Reads a Cursor hook payload from stdin and forwards it to the agent-den collector.
// Must never block or fail the agent: answers first, short timeout, errors swallowed, always exit 0.

import { forward, parsePayload, readStdin } from '../den/launcher/forward.mjs';
import { answer } from './plugin.mjs';

const raw = await readStdin();
const payload = parsePayload(raw);
answer(payload ?? { hook_event_name: /"hook_event_name"\s*:\s*"(\w+)"/.exec(raw)?.[1] });
if (payload) {
  await forward(payload, 'cursor');
}
process.exit(0);
