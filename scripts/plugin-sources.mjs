// Shared by build-plugin.mjs and check-plugin.mjs: the plugins, their one version and a hash of everything that ends
// up in them, so a release can't ship new code under an old version number (users would never get it).

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(fileURLToPath(import.meta.url), '..', '..');

/** Every plugin gets the same `den/`: the collector, the web app and the launcher they share. */
export const plugins = [
  { name: 'Claude Code', dir: join(root, 'plugins', 'claude-code'), manifest: join('.claude-plugin', 'plugin.json') },
  { name: 'Cursor', dir: join(root, 'plugins', 'cursor'), manifest: join('.cursor-plugin', 'plugin.json') },
].map(plugin => ({
  ...plugin,
  manifestFile: join(plugin.dir, plugin.manifest),
  denDir: join(plugin.dir, 'den'),
  buildInfoFile: join(plugin.dir, 'den', 'build-info.json'),
}));

/** The version is set in the Claude Code manifest; `npm run build:plugin` copies it into the others. */
export const versionSource = plugins[0];

export const launcherDir = join(root, 'plugins', 'launcher');

const SOURCE_DIRS = [
  'apps/collector/src',
  'apps/web/src',
  'apps/web/public',
  'packages/contracts/src',
  'plugins/launcher',
  'plugins/claude-code/scripts',
  'plugins/claude-code/hooks',
  'plugins/claude-code/skills',
  'plugins/cursor/scripts',
  'plugins/cursor/hooks',
  'plugins/cursor/skills',
];

export const readManifest = plugin => JSON.parse(readFileSync(plugin.manifestFile, 'utf8'));

export function pluginVersion() {
  return readManifest(versionSource).version;
}

/** sha256 over the tracked and new (not ignored) source files, tests excluded. */
export function sourcesHash() {
  const files = execSync(`git ls-files --cached --others --exclude-standard -- ${SOURCE_DIRS.join(' ')}`, {
    cwd: root,
    encoding: 'utf8',
  })
    .split('\n')
    .filter(file => file && !/\.(spec|test)\.[cm]?[jt]s$/.test(file))
    .sort();
  const hash = createHash('sha256');
  for (const file of files) {
    try {
      hash
        .update(file)
        .update('\0')
        .update(readFileSync(join(root, file)))
        .update('\0');
    } catch {
      // Deleted in the working tree but still in the index.
    }
  }
  return hash.digest('hex');
}

export function readBuildInfo(plugin) {
  try {
    return JSON.parse(readFileSync(plugin.buildInfoFile, 'utf8'));
  } catch {
    return null;
  }
}
