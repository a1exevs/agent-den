// `/agent-den:den`: starts the collector if needed and opens the den in the default browser.
// Prints one line for the skill to relay.

import { spawn } from 'node:child_process';

import { port } from './forward.mjs';
import { denUrl, ensureCollector, logFile } from './den-server.mjs';

function openBrowser(url) {
  const [command, args] =
    process.platform === 'win32'
      ? ['cmd', ['/c', 'start', '', url]]
      : process.platform === 'darwin'
        ? ['open', [url]]
        : ['xdg-open', [url]];
  spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true }).unref();
}

const state = await ensureCollector().catch(() => 'failed');
if (state === 'failed') {
  process.stdout.write(`agent-den: the collector did not start. Log: ${logFile()}\n`);
} else if (state === 'foreign') {
  process.stdout.write(`agent-den: port ${port} is taken by another program, so the den can't start there.\n`);
} else if (state === 'dev') {
  process.stdout.write('agent-den: a development collector is running; open the dev den at http://localhost:4210\n');
} else {
  openBrowser(denUrl);
  process.stdout.write(`agent-den: the den is open at ${denUrl}\n`);
}
