// Starts the bundled collector (which also serves the den) when it isn't running, and upgrades a collector left
// over from an older plugin version. See `decide` in version.mjs for every case. Shared by the Claude Code and the
// Cursor plugin: whichever starts first runs the one collector both report to.

import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, openSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { denHome } from './den-home.mjs';
import { collectorUrl, port } from './forward.mjs';
import { decide } from './version.mjs';

const LOG_LIMIT_BYTES = 1024 * 1024;
export const denUrl = `http://localhost:${port}`;

/** `version` from the plugin's manifest (`.claude-plugin/plugin.json`, `.cursor-plugin/plugin.json`). */
export function readPluginVersion(manifestFile) {
  try {
    return JSON.parse(readFileSync(manifestFile, 'utf8')).version;
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

/**
 * Moves what an older plugin version kept in its own folder (the saved den, the pause flag) into the shared one,
 * unless the shared one already has it.
 */
function adoptLegacyData(legacyDir, dir) {
  if (!legacyDir || legacyDir === dir) {
    return;
  }
  for (const name of ['den-state.json', 'paused']) {
    const from = join(legacyDir, name);
    const to = join(dir, name);
    try {
      if (existsSync(from) && !existsSync(to)) {
        cpSync(from, to);
      }
      rmSync(from, { force: true });
    } catch {
      // Nothing to adopt, or not readable: the den starts empty, as it would anyway.
    }
  }
}

/**
 * @param {object} plugin
 * @param {string} plugin.root the plugin folder (holds `den/`)
 * @param {string} plugin.version the plugin version, reported by the collector it starts
 * @param {string} plugin.startCommand how the user starts the den in this agent (for messages)
 * @param {string} [plugin.legacyDataDir] where an older version of this plugin kept its data
 */
export function denServer(plugin) {
  const dataDir = () => {
    const dir = denHome();
    mkdirSync(dir, { recursive: true });
    adoptLegacyData(plugin.legacyDataDir, dir);
    return dir;
  };
  const pauseFile = () => join(dataDir(), 'paused');
  const logFile = () => join(dataDir(), 'collector.log');

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

  return {
    startCommand: plugin.startCommand,
    logFile,

    /** The stop command pauses the den: new sessions don't start it until the start command. */
    isPaused: () => existsSync(pauseFile()),

    setPaused(paused) {
      if (paused) {
        writeFileSync(pauseFile(), `${new Date().toISOString()}\n`);
      } else {
        rmSync(pauseFile(), { force: true });
      }
    },

    /**
     * Saves the den and stops our collector.
     * @returns {Promise<'stopped' | 'not-running' | 'dev' | 'foreign' | 'failed'>}
     */
    async stopCollector() {
      const current = await probe();
      if (current.state === 'down') {
        return 'not-running';
      }
      if (current.state === 'foreign') {
        return 'foreign';
      }
      if (current.version === 'dev') {
        return 'dev';
      }
      await fetch(`${collectorUrl}/shutdown`, { method: 'POST', signal: AbortSignal.timeout(500) }).catch(() => {});
      return (await waitFor(async () => (await probe()).state === 'down', 3000)) ? 'stopped' : 'failed';
    },

    /**
     * @returns {Promise<'running' | 'started' | 'keep-newer' | 'dev' | 'foreign' | 'failed'>}
     */
    async ensureCollector() {
      const { version } = plugin;
      const action = decide(await probe(), version);
      if (action !== 'start' && action !== 'replace') {
        return action;
      }
      if (action === 'replace') {
        await fetch(`${collectorUrl}/shutdown`, { method: 'POST', signal: AbortSignal.timeout(500) }).catch(() => {});
        await waitFor(async () => (await probe()).state === 'down', 3000);
      }

      const script = join(plugin.root, 'den', 'collector.mjs');
      if (!existsSync(script)) {
        return 'failed';
      }
      const log = openLog();
      const child = spawn(process.execPath, [script], {
        detached: true,
        windowsHide: true,
        stdio: ['ignore', log, log],
        env: {
          ...process.env,
          AGENT_DEN_VERSION: version,
          AGENT_DEN_WEB_DIR: join(plugin.root, 'den', 'web'),
          // Outside the versioned plugin folder: the next version loads what this one saved.
          AGENT_DEN_STATE_FILE: join(dataDir(), 'den-state.json'),
        },
      });
      child.unref();
      const up = await waitFor(async () => {
        const current = await probe();
        return current.state === 'den' && current.version === version;
      }, 5000);
      return up ? 'started' : 'failed';
    },
  };
}
