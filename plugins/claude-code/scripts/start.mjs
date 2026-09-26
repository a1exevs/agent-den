// `/agent-den:start`: lifts a pause, starts the collector if needed and opens the den in the default browser.
// Prints one line for the skill to relay.

import { startDen } from '../den/launcher/commands.mjs';
import { den } from './plugin.mjs';

process.stdout.write(`${await startDen(den)}\n`);
