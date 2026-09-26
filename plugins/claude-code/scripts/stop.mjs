// `/agent-den:stop`: saves the den, stops the collector and pauses it — new sessions don't start it again until
// `/agent-den:start`. Prints one line for the skill to relay.

import { setPaused, stopCollector } from './den-server.mjs';
import { port } from './forward.mjs';

setPaused(true);
const state = await stopCollector().catch(() => 'failed');
const lines = {
  stopped: 'agent-den: stopped; the cats are saved. New sessions leave it off until /agent-den:start.',
  'not-running': 'agent-den: was not running; it stays off until /agent-den:start.',
  dev: 'agent-den: a development collector is running (npm run dev:collector); stop it in its terminal.',
  foreign: `agent-den: port ${port} belongs to another program; nothing to stop.`,
  failed:
    'agent-den: the collector did not stop in time; try again, or end the node process running den/collector.mjs.',
};
process.stdout.write(`${lines[state] ?? lines.failed}\n`);
