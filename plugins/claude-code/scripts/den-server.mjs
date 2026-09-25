// Starts the bundled collector (which also serves the den) when it isn't running, and replaces a collector left
// over from an older plugin version. A collector reporting version `dev` is a developer's own — left alone.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectorUrl, port } from './forward.mjs';

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..');
export const denUrl = `http://localhost:${port}`;

function pluginVersion() {
  try {
    return JSON.parse(readFileSync(join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8')).version;
  } catch {
    return 'unknown';
  }
}

async function health() {
  try {
    const response = await fetch(`${collectorUrl}/health`, { signal: AbortSignal.timeout(500) });
    return response.ok ? await response.json() : null;
  } catch {
    return null;
  }
}

async function waitFor(check, timeoutMs) {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (await check()) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  return false;
}

function logFile() {
  const dir = process.env.CLAUDE_PLUGIN_DATA ?? join(tmpdir(), 'agent-den');
  mkdirSync(dir, { recursive: true });
  return join(dir, 'collector.log');
}

/**
 * @returns {Promise<'running' | 'started' | 'dev' | 'failed'>}
 */
export async function ensureCollector() {
  const version = pluginVersion();
  const current = await health();
  if (current?.version === 'dev') {
    return 'dev';
  }
  if (current?.version === version) {
    return 'running';
  }
  if (current) {
    await fetch(`${collectorUrl}/shutdown`, { method: 'POST', signal: AbortSignal.timeout(500) }).catch(() => {});
    await waitFor(async () => !(await health()), 3000);
  }

  const script = join(pluginRoot, 'den', 'collector.mjs');
  if (!existsSync(script)) {
    return 'failed';
  }
  const log = openSync(logFile(), 'a');
  const child = spawn(process.execPath, [script], {
    detached: true,
    windowsHide: true,
    stdio: ['ignore', log, log],
    env: { ...process.env, AGENT_DEN_VERSION: version, AGENT_DEN_WEB_DIR: join(pluginRoot, 'den', 'web') },
  });
  child.unref();
  return (await waitFor(async () => (await health())?.version === version, 5000)) ? 'started' : 'failed';
}

export { logFile };
