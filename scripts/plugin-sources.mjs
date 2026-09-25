// Shared by build-plugin.mjs and check-plugin.mjs: the plugin version and a hash of everything that ends up in the
// plugin, so a release can't ship new code under an old version number (users would never get it).

import { execSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const root = join(fileURLToPath(import.meta.url), '..', '..');
export const pluginDir = join(root, 'plugins', 'claude-code');
export const denDir = join(pluginDir, 'den');
export const buildInfoFile = join(denDir, 'build-info.json');

const SOURCE_DIRS = [
  'apps/collector/src',
  'apps/web/src',
  'apps/web/public',
  'packages/contracts/src',
  'plugins/claude-code/scripts',
  'plugins/claude-code/hooks',
  'plugins/claude-code/skills',
];

export function pluginVersion() {
  return JSON.parse(readFileSync(join(pluginDir, '.claude-plugin', 'plugin.json'), 'utf8')).version;
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

export function readBuildInfo() {
  try {
    return JSON.parse(readFileSync(buildInfoFile, 'utf8'));
  } catch {
    return null;
  }
}
