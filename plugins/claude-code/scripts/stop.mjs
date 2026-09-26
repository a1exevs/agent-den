// `/agent-den:stop`: saves the den, stops the collector and pauses it — new sessions don't start it again until
// `/agent-den:start`. Prints one line for the skill to relay.

import { stopDen } from '../den/launcher/commands.mjs';
import { den } from './plugin.mjs';

process.stdout.write(`${await stopDen(den)}\n`);
