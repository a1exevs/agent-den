// Starts the bundled collector (which also serves the den) when it isn't running, and upgrades a collector left
// over from an older plugin version. See `decide` in version.mjs for every case.

import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, openSync, readFileSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { collectorUrl, port } from './forward.mjs';
import { decide } from './version.mjs';

const pluginRoot = process.env.CLAUDE_PLUGIN_ROOT ?? join(dirname(fileURLToPath(import.meta.url)), '..');
const LOG_LIMIT_BYTES = 1024 * 1024;
export const denUrl = `http://localhost:${port}`;

function pluginVersion() {
  try {
    return JSON.parse(readFileSync(join(pluginRoot, '.claude-plugin', 'plugin.json'), 'utf8')).version;
  } catch {
    return 'unknown';
  }
}

/** @returns {Promise<{ state: 'down' } | { state: 'foreign' } | { state: 'den', version: string }>} */
async function probe() {
  let response;
  try {
    response = await fetch(`${collectorUrl}/health`, { signal: AbortSignal.timeout(500) });
  } catch {
    return { state: 'down' };
  }
  try {
    const body = await response.json();
    return body?.ok === true && typeof body.version === 'string'
      ? { state: 'den', version: body.version }
      : { state: 'foreign' };
  } catch {
    return { state: 'foreign' };
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

export function logFile() {
  const dir = process.env.CLAUDE_PLUGIN_DATA ?? join(tmpdir(), 'agent-den');
  mkdirSync(dir, { recursive: true });
  return join(dir, 'collector.log');
}

function openLog() {
  const file = logFile();
  let size = 0;
  try {
    size = statSync(file).size;
  } catch {
    // No log yet.
  }
  return openSync(file, size > LOG_LIMIT_BYTES ? 'w' : 'a');
}

/**
 * @returns {Promise<'running' | 'started' | 'keep-newer' | 'dev' | 'foreign' | 'failed'>}
 */
export async function ensureCollector() {
  const version = pluginVersion();
  const action = decide(await probe(), version);
  if (action !== 'start' && action !== 'replace') {
    return action;
  }
  if (action === 'replace') {
    await fetch(`${collectorUrl}/shutdown`, { method: 'POST', signal: AbortSignal.timeout(500) }).catch(() => {});
    await waitFor(async () => (await probe()).state === 'down', 3000);
  }

  const script = join(pluginRoot, 'den', 'collector.mjs');
  if (!existsSync(script)) {
    return 'failed';
  }
  const log = openLog();
  const child = spawn(process.execPath, [script], {
    detached: true,
    windowsHide: true,
    stdio: ['ignore', log, log],
    env: { ...process.env, AGENT_DEN_VERSION: version, AGENT_DEN_WEB_DIR: join(pluginRoot, 'den', 'web') },
  });
  child.unref();
  const up = await waitFor(async () => {
    const current = await probe();
    return current.state === 'den' && current.version === version;
  }, 5000);
  return up ? 'started' : 'failed';
}
