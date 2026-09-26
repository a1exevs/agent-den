// Where the den keeps its data. Pure, so it is tested (`den-home.test.mjs`).

import { homedir } from 'node:os';
import { join } from 'node:path';

/**
 * One folder for every plugin (Claude Code and Cursor share one collector): the saved den, the pause flag, the log.
 * Outside any versioned plugin folder, so an update keeps it; `AGENT_DEN_HOME` moves it.
 */
export function denHome(env = process.env, home = homedir()) {
  return env.AGENT_DEN_HOME || join(home, '.agent-den');
}
