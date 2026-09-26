// The start and stop commands of every plugin: one line of text for the agent to relay to the user.

import { spawn } from 'node:child_process';

import { denUrl } from './den-server.mjs';
import { port } from './forward.mjs';

function openBrowser(url) {
  if (process.env.AGENT_DEN_NO_BROWSER) {
    return;
  }
  const [command, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
}

/** Lifts a pause, starts the collector if needed and opens the den in the default browser. */
export async function startDen(den) {
  den.setPaused(false);
  const state = await den.ensureCollector().catch(() => 'failed');
  if (state === 'failed') {
    return `agent-den: the collector did not start. Log: ${den.logFile()}`;
  }
  if (state === 'foreign') {
    return `agent-den: port ${port} is taken by another program, so the den can't start there.`;
  }
  if (state === 'dev') {
    return 'agent-den: a development collector is running; open the dev den at http://localhost:4210';
  }
  openBrowser(denUrl);
  return `agent-den: the den is open at ${denUrl}`;
}

/** Saves the den, stops the collector and pauses it: new sessions leave it off until the start command. */
export async function stopDen(den) {
  den.setPaused(true);
  const state = await den.stopCollector().catch(() => 'failed');
  const lines = {
    stopped: `agent-den: stopped; the cats are saved. New sessions leave it off until ${den.startCommand}.`,
    'not-running': `agent-den: was not running; it stays off until ${den.startCommand}.`,
    dev: 'agent-den: a development collector is running (npm run dev:collector); stop it in its terminal.',
    foreign: `agent-den: port ${port} belongs to another program; nothing to stop.`,
    failed:
      'agent-den: the collector did not stop in time; try again, or end the node process running den/collector.mjs.',
  };
  return lines[state] ?? lines.failed;
}
